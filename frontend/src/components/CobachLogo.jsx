// Logo institucional real (COBACH Sonora), reutilizable.
// La imagen vive en frontend/public/cobach-logo.png
export default function CobachLogo({ size = 'md', onChip = false }) {
  return (
    <div className={`cb-logo ${size} ${onChip ? 'on-chip' : ''}`}>
      <img src="/cobach-logo.png" alt="Colegio de Bachilleres del Estado de Sonora" />
    </div>
  );
}
