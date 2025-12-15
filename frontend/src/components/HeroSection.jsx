import imgSrc from "../assets/Front1.jpg";
import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section
      id="hero"
      // Keep it relative and centered. 
      // We removed pt-[5rem] previously, keep it removed so it centers perfectly.
      className="relative flex items-center justify-center overflow-hidden"
      style={{ 
        // ⭐ FINAL FIX: Use 'svh' (Small Viewport Height). 
        // This sets the height to fit the screen WITH the mobile address bar visible.
        // It prevents the "jump" when scrolling because it doesn't try to resize dynamically.
        height: '100svh' 
      }} 
    >
      {/* Background */}
      <div className="absolute inset-0 -z-20">
        <img
          src={imgSrc}
          className="w-full h-full object-cover object-center"
          alt="Background"
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/10 via-black/30 to-black/80"></div>

      {/* Hero Content */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-white tracking-wider"
          style={{
            fontFamily: "'Great Vibes', cursive",
            fontWeight: 400,
            fontSize: "clamp(2.8rem, 8vw, 6.5rem)",
          }}
        >
          Klubnika Café
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-white uppercase opacity-90 tracking-[0.25em]"
          style={{
            fontSize: "clamp(0.9rem, 3vw, 1.8rem)",
          }}
        >
          India
        </motion.p>
      </div>
    </section>
  );
};

export default HeroSection;