export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{
          background: "radial-gradient(circle, #6c63ff, transparent)",
          top: "-80px",
          left: "-80px",
        }}
      />
      <div
        className="absolute w-80 h-80 rounded-full blur-3xl opacity-10"
        style={{
          background: "radial-gradient(circle, #00e5ff, transparent)",
          bottom: "10%",
          right: "-60px",
        }}
      />
    </div>
  );
}
