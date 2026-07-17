export function getHealthStatus(_req, res) {
  res.status(200).json({
    success: true,
    message: "DocuMind API is running.",
    timestamp: new Date().toISOString(),
  });
}