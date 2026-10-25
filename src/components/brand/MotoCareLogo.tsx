/**
 * MotoCare wordmark: the letters of MOTOCARE form a motorcycle (seat on the first O,
 * tank arc, handlebar and fork after the E). Letters are Anton (SIL Open Font License)
 * converted to outlines, so no font is needed.
 * MOTO and the bike parts follow the text color (set it with a text-* class);
 * CARE and the front fender are always brand orange.
 */
export default function MotoCareLogo({
  className = 'h-8 w-auto',
  title = 'MotoCare',
  animated = false,
}: {
  className?: string;
  title?: string;
  /** Letters rise in one by one, the bike is drawn, then it idles (index.css .mc-anim) */
  animated?: boolean;
}) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -41 574 235" role="img" aria-label={title} className={`${animated ? 'mc-anim ' : ''}${className}`}
    >
      <g fill="currentColor">
        <path className="mc-seat" d="M 111.3 61.9 C 107.3 25.9, 123.3 15.9, 135.3 33.9 C 145.3 45.9, 164.1 45.9, 182.1 39.9 C 188.1 37.9, 190.1 47.9, 184.1 59.9 Z" />
        <path className="mc-letter" style={{ animationDelay: '0ms' }} d="M43.2 160L24.6 160L24.6 56.9L56 56.9L64.7 119.8L73.3 56.9L105 56.9L105 160L86.1 160L86.1 85.7L74.3 160L55.7 160L43.2 85.7L43.2 160Z" />
        <path className="mc-letter" style={{ animationDelay: '70ms' }} d="M140.7 160.9L140.7 160.9Q128.4 160.9 121.8 153.5Q115.3 146 115.3 131.9L115.3 131.9L115.3 82.9Q115.3 69.7 121.8 62.8Q128.2 55.9 140.7 55.9L140.7 55.9Q153.2 55.9 159.7 62.8Q166.1 69.7 166.1 82.9L166.1 82.9L166.1 131.9Q166.1 146 159.6 153.5Q153.1 160.9 140.7 160.9ZM140.9 142L140.9 142Q145.6 142 145.6 132.9L145.6 132.9L145.6 82.5Q145.6 74.9 141 74.9L141 74.9Q135.9 74.9 135.9 82.7L135.9 82.7L135.9 133Q135.9 137.8 137 139.9Q138.2 142 140.9 142Z" />
        <path className="mc-letter" style={{ animationDelay: '140ms' }} d="M205.9 160L185.3 160L185.3 76.7L173.1 76.7L173.1 56.9L218.2 56.9L218.2 76.7L205.9 76.7L205.9 160Z" />
        <path className="mc-letter" style={{ animationDelay: '210ms' }} d="M250.5 160.9L250.5 160.9Q238.2 160.9 231.6 153.5Q225.1 146 225.1 131.9L225.1 131.9L225.1 82.9Q225.1 69.7 231.6 62.8Q238.1 55.9 250.5 55.9L250.5 55.9Q263 55.9 269.5 62.8Q276 69.7 276 82.9L276 82.9L276 131.9Q276 146 269.4 153.5Q262.9 160.9 250.5 160.9ZM250.7 142L250.7 142Q255.4 142 255.4 132.9L255.4 132.9L255.4 82.5Q255.4 74.9 250.8 74.9L250.8 74.9Q245.7 74.9 245.7 82.7L245.7 82.7L245.7 133Q245.7 137.8 246.8 139.9Q248 142 250.7 142Z" />
        <rect className="mc-part" x="425.2" y="-30.1" width="22" height="12" rx="6" />
      </g>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path className="mc-draw" pathLength={1} style={{ animationDelay: '560ms' }} strokeWidth="9" d="M 188.1 45.9 C 248.2 5.9, 405.4 5.9, 468.6 49.9" />
        <path className="mc-draw" pathLength={1} style={{ animationDelay: '760ms' }} strokeWidth="7" d="M 537.2 154 L 499.2 -14.1 Q 493.2 -24.1, 477.2 -24.1 L 441.2 -24.1" />
        <path className="mc-draw" pathLength={1} style={{ animationDelay: '600ms' }} strokeWidth="6" d="M 26.6 174 L 276 174" />
      </g>
      <g className="text-orange-500">
        <path className="mc-draw" pathLength={1} style={{ animationDelay: '980ms' }} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" d="M 511.2 162 A 26 26 0 0 0 559.2 140" />
        <g fill="currentColor">
          <path className="mc-letter" style={{ animationDelay: '280ms' }} d="M310.3 160.9L310.3 160.9Q299.1 160.9 292.3 154Q285.5 147 285.5 134.5L285.5 134.5L285.5 86.9Q285.5 71.9 291.4 63.9Q297.4 55.9 310.8 55.9L310.8 55.9Q318.1 55.9 323.8 58.6Q329.5 61.3 332.8 66.7Q336.1 72.1 336.1 80.2L336.1 80.2L336.1 98L315.6 98L315.6 82.8Q315.6 78.1 314.4 76.5Q313.2 74.9 310.8 74.9L310.8 74.9Q307.9 74.9 306.9 77Q305.9 79.1 305.9 82.5L305.9 82.5L305.9 134.2Q305.9 138.4 307.2 140.2Q308.4 142 310.8 142L310.8 142Q313.4 142 314.5 139.8Q315.6 137.6 315.6 134.2L315.6 134.2L315.6 115.6L336.3 115.6L336.3 135.1Q336.3 148.7 329.5 154.8Q322.6 160.9 310.3 160.9Z" />
          <path className="mc-letter" style={{ animationDelay: '350ms' }} d="M362.4 160L342.4 160L352.3 56.9L387.3 56.9L397.1 160L377.6 160L376.1 143.4L363.7 143.4L362.4 160ZM369.1 74.5L365.2 126.9L374.5 126.9L370 74.5L369.1 74.5Z" />
          <path className="mc-letter" style={{ animationDelay: '420ms' }} d="M426.3 160L405.4 160L405.4 56.9L437.1 56.9Q445 56.9 449 60.5Q453.1 64.1 454.4 70.6Q455.8 77 455.8 85.8L455.8 85.8Q455.8 94.2 453.7 99.2Q451.5 104.3 445.6 106.2L445.6 106.2Q450.5 107.2 452.4 111Q454.4 114.9 454.4 121L454.4 121L454.4 160L434.1 160L434.1 119.6Q434.1 115.1 432.2 114Q430.4 113 426.3 113L426.3 113L426.3 160ZM426.4 76L426.4 95.1L431.4 95.1Q435.7 95.1 435.7 85.8L435.7 85.8Q435.7 79.7 434.7 77.9Q433.8 76 431.2 76L431.2 76L426.4 76Z" />
          <path className="mc-letter" style={{ animationDelay: '490ms' }} d="M507.2 160L464.6 160L464.6 56.9L505.9 56.9L505.9 76.8L485.6 76.8L485.6 96.9L505 96.9L505 116.3L485.6 116.3L485.6 139.9L507.2 139.9L507.2 160Z" />
        </g>
      </g>
    </svg>
  );
}
