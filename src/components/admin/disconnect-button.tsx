"use client";

export function DisconnectButton({ repoId }: { repoId: string }) {
  async function handle() {
    await fetch(`/api/client/repos/${repoId}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <button
      onClick={handle}
      className="text-xs text-red-500 hover:text-red-400 transition-colors"
    >
      Disconnect
    </button>
  );
}
