import { motion } from 'framer-motion';

/** Magic UI-style word-by-word blur reveal for headers. */
export default function TextReveal({ text, as: Tag = 'h1', className = '' }) {
  const words = text.split(' ');
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => (
        <motion.span key={`${w}-${i}`} aria-hidden="true" className="mr-[0.25em] inline-block"
          initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: i * 0.08, duration: 0.55, ease: 'easeOut' }}>{w}</motion.span>
      ))}
    </Tag>
  );
}
