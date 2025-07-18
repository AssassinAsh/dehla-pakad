import React from "react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#00D2FF]/20 via-transparent to-[#FF4C4C]/20 rounded-2xl blur-lg"></div>

        {/* Main modal */}
        <div className="relative bg-[#040e16]/90 backdrop-blur-xl border border-[#00D2FF]/30 rounded-2xl shadow-2xl flex flex-col min-h-0">
          {/* Fixed Header */}
          <div className="flex justify-between items-center p-6 flex-shrink-0 bg-[#040e16]/95 backdrop-blur-xl border-b border-[#00D2FF]/20 rounded-t-2xl">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] to-white">
              Dehla Pakad Rules
            </h2>
            <button
              onClick={onClose}
              className="group relative w-8 h-8 rounded-full bg-[#FF4C4C]/20 hover:bg-[#FF4C4C]/30 border border-[#FF4C4C]/30 hover:border-[#FF4C4C]/50 flex items-center justify-center transition-all duration-300 transform hover:scale-110"
              aria-label="Close rules"
            >
              <svg
                className="w-4 h-4 text-[#FF4C4C] group-hover:text-white transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 prose max-w-none text-[#00D2FF]/90">
            <p className="text-[#00D2FF]/80 leading-relaxed">
              <strong className="text-[#00D2FF]">Objective:</strong> The main
              goal is to win tricks that contain &apos;Tens&apos; (Dehlas). The
              team that collects all four Tens wins the round.
            </p>

            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] to-white">
              Players &amp; Teams
            </h3>
            <p className="text-[#00D2FF]/80 leading-relaxed">
              Dehla Pakad is a 4-player game with two competing teams. Players
              sitting opposite each other form a team.
            </p>

            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] to-white">
              The Deal &amp; Trump
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-[#00D2FF]/80">
              <li className="leading-relaxed">
                Each player is dealt 5 cards first, starting with the player to
                the dealer&apos;s left and proceeding clockwise.
              </li>
              <li className="leading-relaxed">
                The first 5 tricks (the &quot;5-card round&quot;) are played
                with these cards.
              </li>
              <li className="leading-relaxed">
                There is no trump suit at the start of the round. The trump suit
                is set dynamically: the first time a player cannot follow suit
                and plays a card of a different suit (&quot;cuts&quot;), that
                suit becomes trump for the rest of the round.
              </li>
              <li className="leading-relaxed">
                After the first 5 tricks are completed,{" "}
                <strong className="text-[#00D2FF]">
                  or as soon as the trump suit is set (whichever comes first)
                </strong>
                , the dealer deals the remaining 8 cards to each player, so
                everyone has 13 cards in total.
              </li>
              <li className="leading-relaxed">
                Once trump is set, it remains the most powerful suit for the
                remainder of the round.
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] to-white">
              Gameplay
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-[#00D2FF]/80">
              <li className="leading-relaxed">
                The player to the dealer&apos;s left starts the first trick.
              </li>
              <li className="leading-relaxed">
                Players must follow the suit of the card that was led if they
                have a card of that suit.
              </li>
              <li className="leading-relaxed">
                If a player cannot follow suit, they may play any card. The
                first time this happens, the suit of the card played becomes
                trump for the round.
              </li>
              <li className="leading-relaxed">
                After trump is set, any card of the trump suit beats all cards
                of other suits in a trick.
              </li>
              <li className="leading-relaxed">
                The first 5 tricks are played with the initial 5 cards. After
                these are completed,{" "}
                <strong className="text-[#00D2FF]">
                  or as soon as the trump suit is set (whichever comes first)
                </strong>
                , the remaining 8 cards are dealt and play continues as normal.
              </li>
              <li className="leading-relaxed">
                The trick is won by the player who played the highest card of
                the leading suit, unless a trump card is played, in which case
                the highest trump wins.
              </li>
              <li className="leading-relaxed">
                The winner of a trick leads the next one.
              </li>
              <li className="leading-relaxed">
                Each trick is collected and stacked by the winner. Teams keep
                their won tricks in a shared pile to track the number of tricks
                and tens collected.
              </li>
              <li className="leading-relaxed">
                Tens (10s) are special cards. The main goal is to collect all
                four tens as a team.
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] to-white">
              Stacking &amp; Consecutive Wins
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-[#00D2FF]/80">
              <li className="leading-relaxed">
                If a single player wins two consecutive rounds, they win the
                stack (all tricks collected so far).
              </li>
              <li className="leading-relaxed">
                If no player wins two consecutive rounds, the player who wins
                the last round wins the whole stack.
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] to-white">
              Scoring (Winning a Round)
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-[#00D2FF]/80">
              <li className="leading-relaxed">
                A round ends when all 13 tricks have been played.
              </li>
              <li className="leading-relaxed">
                The team that has collected more Tens at the end of the round
                wins.
              </li>
              <li className="leading-relaxed">
                If both teams have two Tens each, the team that won the 7th
                trick wins the round.
              </li>
              <li className="leading-relaxed">
                <strong className="text-[#00D2FF]">Kot:</strong> If a team wins
                the round and the opposing team has won zero tricks, it&apos;s a
                &apos;Kot&apos;. This results in a penalty for the losing team.
              </li>
              <li className="leading-relaxed">
                <strong className="text-[#00D2FF]">Dehla Pakad:</strong> If one
                team collects all four Tens, they win the round instantly. This
                is the ultimate goal.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesModal;
