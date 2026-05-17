import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/utils/translations";

const DEFAULT_LOGO_SRC = "/images/undj-logo.png";

interface InstitutionalHeaderProps {
  universityName?: string;
  facultyName?: string;
  academicYear?: string;
  /** Public URL (e.g. `/images/undj-logo.png`). */
  logoSrc?: string;
  logoAlt?: string;
}

const InstitutionalHeader = ({
  universityName,
  facultyName,
  academicYear,
  logoSrc = DEFAULT_LOGO_SRC,
  logoAlt = "Logo of the University of N'Djamena (UNDJ)",
}: InstitutionalHeaderProps) => {
  const { language } = useLanguage();

  return (
    <header className="bg-header text-header-foreground">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95 p-0.5 ring-1 ring-header-foreground/15">
            <img src={logoSrc} alt={logoAlt} className="h-full w-full object-contain" width={44} height={44} />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              {universityName || t(language, "universityName")}
            </h1>
            <p className="text-sm text-header-foreground/80">{facultyName || t(language, "facultyName")}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-header-foreground/70 uppercase tracking-wide">
              {t(language, "academicYearLabel")}
            </p>
            <p className="text-sm font-medium">{academicYear}</p>
          </div>
        </div>
      </div>
      <div className="bg-header-foreground/10 px-6 py-1.5">
        <p className="text-xs text-header-foreground/90">
          {t(language, "teachingManagementSystem")}
        </p>
      </div>
    </header>
  );
};

export default InstitutionalHeader;
