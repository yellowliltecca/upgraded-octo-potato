interface SiteHeaderProps {
  onContactClick: () => void;
}

export function SiteHeader({ onContactClick }: SiteHeaderProps) {
  return (
    <header className="w-full border-b border-[#F0EDE6]/15 bg-[#161615]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {/* Zone 1: Single-line bold street wordmark */}
        <a
          href="#page-hero"
          className="font-display text-2xl font-bold uppercase tracking-wider text-[#F0EDE6] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#FF5A1F]"
        >
          Захар
        </a>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav
          aria-label="Навигация по сайту"
          className="order-3 md:order-none flex w-full md:w-auto items-center gap-5 overflow-x-auto md:overflow-visible border-t md:border-0 border-[#F0EDE6]/10 pt-2 md:pt-0 text-xs sm:text-sm font-medium text-[#B8B4AC] whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <a
            href="#page-hero"
            className="hover:text-[#F0EDE6] transition-colors whitespace-nowrap shrink-0"
          >
            Главная
          </a>
          <a
            href="#page-about"
            className="hover:text-[#F0EDE6] transition-colors whitespace-nowrap shrink-0"
          >
            Обо мне
          </a>
          <a
            href="#page-stack"
            className="hover:text-[#F0EDE6] transition-colors whitespace-nowrap shrink-0"
          >
            Инструменты
          </a>
          <a
            href="#page-approach"
            className="hover:text-[#F0EDE6] transition-colors whitespace-nowrap shrink-0"
          >
            Подход
          </a>
          <a
            href="#page-contact"
            className="hover:text-[#F0EDE6] transition-colors whitespace-nowrap shrink-0"
          >
            Контакты
          </a>
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onContactClick}
            className="min-h-11 px-4 py-2.5 text-xs font-semibold tracking-wide text-[#161615] bg-[#F0EDE6] hover:bg-[#FF5A1F] hover:text-[#161615] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#FF5A1F] focus-visible:outline-offset-2"
          >
            Связаться
          </button>
        </div>
      </div>
    </header>
  );
}
