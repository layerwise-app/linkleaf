/** A phone shell around a page. `zoom` keeps the layout box the right size. */
export function PhoneFrame({
  children,
  scale,
  className
}: {
  children: React.ReactNode;
  scale?: number;
  className?: string;
}) {
  return (
    <div
      className={`ll-phone ${className ?? ''}`}
      style={scale ? { zoom: scale } : undefined}
    >
      <div className='ll-phone-screen' tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
