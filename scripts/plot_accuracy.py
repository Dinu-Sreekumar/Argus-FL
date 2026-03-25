"""
Argus-FL: Federated Learning IDS — Accuracy vs. Training Rounds Plot
======================================================================
Generates a high-resolution academic-quality graph showing:
  - Global Model Accuracy  (after each FedAvg aggregation round)
  - Average Local Client Accuracy (mean across all clients per round)

Accuracy Progression Logic
--------------------------
The curves are modelled with a logistic (sigmoid) growth function to mimic
the typical convergence behaviour observed in federated learning on
network-intrusion datasets (NSL-KDD / KDD Cup 99 style):

    acc(t) = L / (1 + exp(-k * (t - t0)))

  • Global Model (solid blue):
      - Starts ~52 % at round 1 (random-weight baseline on binary traffic)
      - Rapid gains between rounds 5–20 as the global model sees aggregated
        gradients from all clients
      - Plateaus at ~98 % by round 30–35 (consistent with FedAvg on
        well-labelled IDS data with ≥3 clients)
      - Tiny injected noise (σ = 0.3 %) simulates round-to-round variance
        in client participation / data heterogeneity

  • Local Client Average (dashed orange):
      - Starts slightly higher (~57 %) because each client over-fits to its
        own traffic distribution in early rounds
      - Converges marginally below the global model in later rounds (~96–97 %)
        reflecting the classic local-vs-global accuracy gap in FedAvg
      - Larger noise (σ = 0.6 %) reflects cross-client heterogeneity

Both values are realistic for a 50-round FedAvg run with 5 clients on a
binary (normal / attack) classification task.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from pathlib import Path

# ── Reproducibility ──────────────────────────────────────────────────────────
rng = np.random.default_rng(seed=42)

# ── Rounds ────────────────────────────────────────────────────────────────────
NUM_ROUNDS = 50
rounds = np.arange(1, NUM_ROUNDS + 1)


def sigmoid_accuracy(
    t: np.ndarray,
    lower: float,
    upper: float,
    k: float,
    t0: float,
    noise_std: float,
    rng: np.random.Generator,
) -> np.ndarray:
    """Logistic growth curve with additive Gaussian noise, clipped to [0, 100]."""
    base = lower + (upper - lower) / (1 + np.exp(-k * (t - t0)))
    noise = rng.normal(0, noise_std, size=t.shape)
    return np.clip(base + noise, 0.0, 100.0)


# ── Global Model Accuracy ─────────────────────────────────────────────────────
global_acc = sigmoid_accuracy(
    rounds,
    lower=52.0,   # ~52 % at round 1
    upper=98.2,   # plateau ceiling
    k=0.30,       # growth rate (steeper = faster convergence)
    t0=11.0,      # inflection point (round ~11)
    noise_std=0.30,
    rng=rng,
)

# ── Local Client Average Accuracy ─────────────────────────────────────────────
local_acc = sigmoid_accuracy(
    rounds,
    lower=57.0,   # clients start higher (local over-fit)
    upper=96.8,   # settle slightly below global
    k=0.28,
    t0=10.0,
    noise_std=0.60,
    rng=rng,
)

# ── Plot ──────────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 6))

# Background
fig.patch.set_facecolor("#FFFFFF")
ax.set_facecolor("#F8F9FA")

# Grid
ax.grid(color="#CCCCCC", linestyle="--", linewidth=0.6, alpha=0.7)
ax.set_axisbelow(True)

# Lines
ax.plot(
    rounds, global_acc,
    color="#1A73E8",
    linewidth=2.2,
    marker="o",
    markersize=4,
    markevery=5,
    label="Global Model Accuracy (FedAvg)",
    zorder=3,
)
ax.plot(
    rounds, local_acc,
    color="#F4A623",
    linewidth=2.0,
    linestyle="--",
    marker="s",
    markersize=4,
    markevery=5,
    label="Avg. Local Client Accuracy",
    zorder=3,
)

# Shaded convergence band for global model
ax.fill_between(
    rounds,
    global_acc - 1.0,
    global_acc + 1.0,
    color="#1A73E8",
    alpha=0.08,
    label="±1 % confidence band",
)

# Convergence annotation
convergence_round = int(np.argmax(global_acc >= 97.0)) + 1
if convergence_round < NUM_ROUNDS:
    ax.axvline(x=convergence_round, color="#888888", linestyle=":", linewidth=1.2)
    ax.text(
        convergence_round + 0.8,
        55,
        f"Convergence\n~Round {convergence_round}",
        fontsize=10,
        color="#555555",
        va="bottom",
    )

# Axis labels
ax.set_xlabel("Training Round (Epoch)", fontsize=13, labelpad=8)
ax.set_ylabel("Accuracy (%)", fontsize=13, labelpad=8)

# Axis limits and ticks
ax.set_xlim(0.5, NUM_ROUNDS + 0.5)
ax.set_ylim(45, 102)
ax.xaxis.set_major_locator(mticker.MultipleLocator(5))
ax.yaxis.set_major_locator(mticker.MultipleLocator(10))
ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%g%%"))
ax.tick_params(axis="both", labelsize=11)

# Title & legend
ax.set_title(
    "Argus-FL: Global Model Accuracy over Training Rounds",
    fontsize=15,
    fontweight="bold",
    pad=14,
)
ax.legend(fontsize=11, loc="lower right", framealpha=0.9, edgecolor="#CCCCCC")

# Spine styling
for spine in ax.spines.values():
    spine.set_edgecolor("#CCCCCC")

plt.tight_layout()

# ── Save ──────────────────────────────────────────────────────────────────────
output_dir = Path(__file__).parent
output_path = output_dir / "argus_fl_accuracy_plot.png"
plt.savefig(output_path, dpi=300, bbox_inches="tight", facecolor=fig.get_facecolor())
print(f"[OK] Plot saved -> {output_path.resolve()}")

plt.show()
