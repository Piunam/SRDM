import argparse
import os
import numpy as np
import rnnoise
import torch
import torch.nn.functional as F
from torch import nn
import tqdm

parser = argparse.ArgumentParser()
parser.add_argument("features", type=str, help="path to feature file in .f32 format")
parser.add_argument("output", type=str, help="path to output folder")
parser.add_argument("--suffix", type=str, default="")
parser.add_argument("--cuda-visible-devices", type=str, default=None)

model_group = parser.add_argument_group(title="model parameters")
model_group.add_argument("--cond-size", type=int, default=128)
model_group.add_argument("--gru-size", type=int, default=384)

training_group = parser.add_argument_group(title="training parameters")
training_group.add_argument("--batch-size", type=int, default=128)
training_group.add_argument("--lr", type=float, default=1e-3)
training_group.add_argument("--epochs", type=int, default=200)
training_group.add_argument("--sequence-length", type=int, default=2000)
training_group.add_argument("--lr-decay", type=float, default=5e-5)
training_group.add_argument("--initial-checkpoint", type=str, default=None)
training_group.add_argument("--gamma", type=float, default=0.25)
training_group.add_argument("--sparse", action="store_true")

args = parser.parse_args()


class RNNoiseDataset(torch.utils.data.Dataset):

  def __init__(self, features_file, sequence_length=2000):
    self.sequence_length = sequence_length
    self.data = np.memmap(features_file, dtype="float32", mode="r")
    dim = 98
    self.nb_sequences = self.data.shape[0] // self.sequence_length // dim
    self.data = self.data[: self.nb_sequences * self.sequence_length * dim]
    self.data = np.reshape(
        self.data, (self.nb_sequences, self.sequence_length, dim)
    )

  def __len__(self):
    return self.nb_sequences

  def __getitem__(self, index):
    return (
        self.data[index, :, :65].copy(),
        self.data[index, :, 65:-1].copy(),
        self.data[index, :, -1:].copy(),
    )

def mask(g):
  return torch.clamp(g + 1, max=1)

device = (
    torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
)
checkpoint_dir = os.path.join(args.output, "checkpoints")
os.makedirs(checkpoint_dir, exist_ok=True)
checkpoint = {
    "model_args": (),
    "model_kwargs": {"cond_size": args.cond_size, "gru_size": args.gru_size},
}

model = rnnoise.RNNoise(
    *checkpoint["model_args"], **checkpoint["model_kwargs"]
)
if args.initial_checkpoint:
  ckpt = torch.load(args.initial_checkpoint, map_location="cpu")
  model.load_state_dict(ckpt["state_dict"], strict=False)

checkpoint["state_dict"] = model.state_dict()
dataset = RNNoiseDataset(args.features)
dataloader = torch.utils.data.DataLoader(
    dataset,
    batch_size=args.batch_size,
    shuffle=True,
    drop_last=True,
    num_workers=4,
)

optimizer = torch.optim.AdamW(
    model.parameters(), lr=args.lr, betas=[0.8, 0.98], eps=1e-8
)
scheduler = torch.optim.lr_scheduler.LambdaLR(
    optimizer=optimizer,
    lr_lambda=lambda x: 1 / (1 + args.lr_decay * x),
)

if __name__ == "__main__":
  model.to(device)
  states = None
  for epoch in range(1, args.epochs + 1):
    running_gain_loss, running_vad_loss, running_loss = 0, 0, 0
    print(f"training epoch {epoch}...")
    with tqdm.tqdm(dataloader, unit="batch") as tepoch:
      for i, (features, gain, vad) in enumerate(tepoch):
        optimizer.zero_grad()
        features, gain, vad = (
            features.to(device),
            gain.to(device),
            vad.to(device),
        )
        
        states = None
        pred_gain, pred_vad, states = model(features, states=states)
        states = [s.detach() for s in states]
        gain, vad = gain[:, 3:-1, :], vad[:, 3:-1, :]
        target_gain = torch.clamp(gain, min=0)
        target_gain = target_gain * (torch.tanh(8 * target_gain) ** 2)

        mask_weight = mask(gain)

        e = pred_gain ** args.gamma - target_gain ** args.gamma
        perceptual_loss = torch.mean((1 + 5.0 * vad) * mask_weight * (e ** 2))

        loss_l1 = torch.mean(mask_weight * torch.abs(pred_gain - target_gain))
        loss_l2 = torch.mean(mask_weight * (pred_gain - target_gain) ** 2)

        gain_loss = perceptual_loss + (0.2 * loss_l1) + (0.1 * loss_l2)

        vad_loss = torch.mean(
            torch.abs(2 * vad - 1)
            * (
                -vad * torch.log(0.01 + pred_vad)
                - (1 - vad) * torch.log(1.01 - pred_vad)
            )
        )
        loss = gain_loss + 0.001 * vad_loss

        loss.backward()
        optimizer.step()
        if args.sparse:
          model.sparsify()
        scheduler.step()

        running_gain_loss += gain_loss.detach().cpu().item()
        running_vad_loss += vad_loss.detach().cpu().item()
        running_loss += loss.detach().cpu().item()
        tepoch.set_postfix(
            loss=f"{running_loss/(i+1):8.5f}",
            gain_loss=f"{running_gain_loss/(i+1):8.5f}",
            vad_loss=f"{running_vad_loss/(i+1):8.5f}",
        )

    checkpoint_path = os.path.join(
        checkpoint_dir, f"rnnoise{args.suffix}_{epoch}.pth"
    )
    checkpoint["state_dict"] = model.state_dict()
    checkpoint["loss"] = running_loss / len(dataloader)
    checkpoint["epoch"] = epoch
    torch.save(checkpoint, checkpoint_path)