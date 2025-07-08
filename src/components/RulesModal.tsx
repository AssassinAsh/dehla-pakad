import React from "react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 text-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 border-2 border-yellow-500">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-yellow-400">
            Dehla Pakad Rules
          </h2>
          <button
            onClick={onClose}
            className="text-white bg-red-600 hover:bg-red-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            aria-label="Close rules"
          >
            &times;
          </button>
        </div>
        <div className="space-y-4 prose prose-invert">
          <p>
            <strong>Objective:</strong> The main goal is to win tricks that
            contain &apos;Tens&apos; (Dehlas). The team that collects all four
            Tens wins the round.
          </p>

          <h3 className="text-xl font-semibold text-yellow-300">
            Players &amp; Teams
          </h3>
          <p>
            Dehla Pakad is a 4-player game with two competing teams. Players
            sitting opposite each other form a team.
          </p>

          <h3 className="text-xl font-semibold text-yellow-300">
            The Deal &amp; Trump
          </h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Each player is dealt 13 cards from a standard 52-card deck.</li>
            <li>
              The game is played with a trump suit, which is determined at the
              start of each round. The player who gets to choose the trump suit
              is selected before the first round begins.
            </li>
            <li>
              The trump-caller declares the trump suit after looking at their
              cards.
            </li>
          </ul>

          <h3 className="text-xl font-semibold text-yellow-300">Gameplay</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              The player to the dealer&apos;s left starts the first trick.
            </li>
            <li>
              Players must follow the suit of the card that was led if they have
              a card of that suit.
            </li>
            <li>
              If a player cannot follow suit, they can play any card, including
              a powerful trump card.
            </li>
            <li>
              The trick is won by the player who played the highest card of the
              leading suit. However, if one or more trump cards were played, the
              highest trump card wins the trick.
            </li>
            <li>The winner of a trick leads the next one.</li>
          </ul>

          <h3 className="text-xl font-semibold text-yellow-300">
            Scoring (Winning a Round)
          </h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>A round ends when all 13 tricks have been played.</li>
            <li>
              The team that has collected more Tens at the end of the round
              wins.
            </li>
            <li>
              If both teams have two Tens each, the team that won the 7th trick
              wins the round.
            </li>
            <li>
              <strong>Kot:</strong> If a team wins the round and the opposing
              team has won zero tricks, it&apos;s a &apos;Kot&apos;. This
              results in a penalty for the losing team.
            </li>
            <li>
              <strong>Dehla Pakad:</strong> If one team collects all four Tens,
              they win the round instantly. This is the ultimate goal.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RulesModal;
