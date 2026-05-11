import { motion } from "motion/react";
import { Trophy } from "lucide-react";

interface VictoryAnimationProps {
  winner: string
}

export function VictoryAnimation({ winner }: VictoryAnimationProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-10 rounded-2xl shadow-2xl text-center"
      >
        <div className="mb-4 flex justify-center">
          <Trophy className="h-14 w-14 text-white drop-shadow-md" aria-hidden strokeWidth={1.25} />
        </div>

        <h1 className="text-2xl font-bold text-white">
          Victoire !
        </h1>

        <p className="text-white mt-2">
          {winner} gagne la partie
        </p>

      </motion.div>

    </div>
  )
}