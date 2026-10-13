import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Share } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

// "Install the app" card — shown only when the browser can install the PWA
// (or on iOS, where we explain Share → Add to Home Screen). Hidden once installed.
export default function InstallAppCard() {
  const { t } = useTranslation();
  const { canInstall, showIOSHint, install } = useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);

  if (!canInstall && !showIOSHint) return null;

  return (
    <div className="mt-5 rounded-md border border-border bg-background/60 p-3">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-md shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{t('install_title')}</p>
          <p className="text-xs text-muted-foreground">{t('install_desc')}</p>
        </div>
        <button
          type="button"
          onClick={() => (canInstall ? install() : setIosOpen(o => !o))}
          className="shrink-0 flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md px-3 py-2 text-xs transition-colors"
        >
          <Download size={13} />
          {t('install_button')}
        </button>
      </div>

      {iosOpen && (
        <p className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
          {t('install_ios_1')} <Share size={13} className="text-primary" /> {t('install_ios_2')}
        </p>
      )}
    </div>
  );
}
