import React from "react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white text-green-950 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col border-2 border-green-800">
        <div className="flex justify-between items-center p-6 sticky top-0 bg-white z-10 border-b border-green-100">
          <h2 className="text-2xl font-bold text-green-800">
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
        <div className="space-y-4 prose max-w-none p-6 pt-2 overflow-y-auto">
          <p>
            <strong>Objective:</strong> The main goal is to win tricks that
            contain &apos;Tens&apos; (Dehlas). The team that collects all four
            Tens wins the round.
          </p>

          <h3 className="text-xl font-semibold text-green-700">
            Players &amp; Teams
          </h3>
          <p>
            Dehla Pakad is a 4-player game with two competing teams. Players
            sitting opposite each other form a team.
          </p>

          <h3 className="text-xl font-semibold text-green-700">
            The Deal &amp; Trump
          </h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Each player is dealt 5 cards first, starting with the player to
              the dealer&apos;s left and proceeding clockwise.
            </li>
            <li>
              The first 5 tricks (the &quot;5-card round&quot;) are played with
              these cards.
            </li>
            <li>
              There is no trump suit at the start of the round. The trump suit
              is set dynamically: the first time a player cannot follow suit and
              plays a card of a different suit (&quot;cuts&quot;), that suit
              becomes trump for the rest of the round.
            </li>
            <li>
              After the first 5 tricks are completed,{" "}
              <strong>
                or as soon as the trump suit is set (whichever comes first)
              </strong>
              , the dealer deals the remaining 8 cards to each player, so
              everyone has 13 cards in total.
            </li>
            <li>
              Once trump is set, it remains the most powerful suit for the
              remainder of the round.
            </li>
          </ul>

          <h3 className="text-xl font-semibold text-green-700">Gameplay</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              The player to the dealer&apos;s left starts the first trick.
            </li>
            <li>
              Players must follow the suit of the card that was led if they have
              a card of that suit.
            </li>
            <li>
              If a player cannot follow suit, they may play any card. The first
              time this happens, the suit of the card played becomes trump for
              the round.
            </li>
            <li>
              After trump is set, any card of the trump suit beats all cards of
              other suits in a trick.
            </li>
            <li>
              The first 5 tricks are played with the initial 5 cards. After
              these are completed,{" "}
              <strong>
                or as soon as the trump suit is set (whichever comes first)
              </strong>
              , the remaining 8 cards are dealt and play continues as normal.
            </li>
            <li>
              The trick is won by the player who played the highest card of the
              leading suit, unless a trump card is played, in which case the
              highest trump wins.
            </li>
            <li>The winner of a trick leads the next one.</li>
            <li>
              Each trick is collected and stacked by the winner. Teams keep
              their won tricks in a shared pile to track the number of tricks
              and tens collected.
            </li>
            <li>
              Tens (10s) are special cards. The main goal is to collect all four
              tens as a team.
            </li>
          </ul>

          <h3 className="text-xl font-semibold text-green-700">
            Stacking &amp; Consecutive Wins
          </h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              If a single player wins two consecutive rounds, they win the stack
              (all tricks collected so far).
            </li>
            <li>
              If no player wins two consecutive rounds, the player who wins the
              last round wins the whole stack.
            </li>
          </ul>

          <h3 className="text-xl font-semibold text-green-700">
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
