import React from 'react';

const Confetti: React.FC = () => {
  const confettiCount = 100; // Number of confetti pieces
  const colors = ['#fde68a', '#fca5a5', '#86efac', '#93c5fd', '#c4b5fd', '#f9a8d4']; // yellow, red, green, blue, purple, pink

  const confetti = Array.from({ length: confettiCount }).map((_, index) => {
    const style: React.CSSProperties = {
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 3 + 2}s`, // 2 to 5 seconds
      animationDelay: `${Math.random() * 5}s`,
      backgroundColor: colors[Math.floor(Math.random() * colors.length)],
      transform: `rotate(${Math.random() * 360}deg)`,
      width: `${Math.floor(Math.random() * 8) + 8}px`, // 8px to 15px
      height: `${Math.floor(Math.random() * 5) + 5}px`, // 5px to 9px
    };
    return <div key={index} className="confetti-piece" style={style} />;
  });

  return (
    <>
      <div className="confetti-container" aria-hidden="true">{confetti}</div>
      <style>{`
        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }
        .confetti-piece {
          position: absolute;
          top: -20px;
          opacity: 0;
          animation-name: fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotateZ(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotateZ(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};

export default Confetti;
