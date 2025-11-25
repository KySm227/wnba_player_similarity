const API_URL = "http://localhost:5001/api";

export const playerService = {
  getAllPlayers: async () => {
    const response = await fetch(`${API_URL}/players`);
    if (!response.ok) throw new Error("Failed to fetch players");
    return response.json();
  },

  getPlayerById: async (id) => {
    const response = await fetch(`${API_URL}/players/${id}`);
    if (!response.ok) throw new Error("Failed to fetch player");
    return response.json();
  },

  createPlayer: async (playerData) => {
    const response = await fetch(`${API_URL}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(playerData),
    });
    if (!response.ok) throw new Error("Failed to create player");
    return response.json();
  },
};
