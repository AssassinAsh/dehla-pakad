export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 mt-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-6 py-4 text-xs text-dp-neon/50">
        <p className="text-center sm:text-left">
          © {new Date().getFullYear()} Dehla Pakad. All rights reserved.
        </p>
        <p className="text-center sm:text-right">
          Crafted with ❤️ by{" "}
          <a
            href="https://www.ashvinrokade.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-dp-neon font-semibold underline underline-offset-2 decoration-dp-neon/40 hover:decoration-dp-neon transition-all"
          >
            Ashvin Rokade
            <svg
              className="w-2.5 h-2.5 opacity-60"
              fill="none"
              viewBox="0 0 10 10"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M1 9L9 1M9 1H3M9 1v6"
              />
            </svg>
          </a>
        </p>
      </div>
    </footer>
  );
}
