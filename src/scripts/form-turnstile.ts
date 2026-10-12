type Turnstile = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  execute(id: string): void;
  reset(id: string): void;
};
declare global { interface Window { turnstile?: Turnstile } }
let loading: Promise<Turnstile> | undefined;
function load(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return loading ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => fail(), 15000);
    const fail = () => { clearTimeout(timer); script.remove(); loading = undefined; reject(new Error('Nie udało się załadować weryfikacji. Sprawdź połączenie i spróbuj ponownie.')); };
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true; script.defer = true;
    script.onerror = fail;
    script.onload = () => { if (!window.turnstile) return fail(); clearTimeout(timer); resolve(window.turnstile); };
    document.head.append(script);
  });
}
export function attachTurnstile(form: HTMLFormElement, action: 'contact' | 'service') {
  const sitekey = form.dataset.turnstile;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname) && ['localhost', '127.0.0.1'].includes(new URL(form.dataset.api || location.origin).hostname);
  const container = document.createElement('div'); container.className = 'form-verification';
  container.style.cssText = 'max-width:100%;margin:16px 0';
  form.querySelector('[type=submit]')!.before(container);
  if (sitekey) form.addEventListener('focusin', () => { void load().catch(() => {}); }, { once: true });
  let widget: string | undefined;
  let settle: ((token?: string) => void) | undefined;
  return {
    async token(): Promise<string> {
      if (!sitekey) {
        if (local) return '';
        throw new Error('Weryfikacja formularza nie jest jeszcze dostępna. Skontaktuj się z nami telefonicznie.');
      }
      const api = await load();
      if (widget === undefined) widget = api.render(container, {
        sitekey, action, theme: 'dark', size: 'flexible', execution: 'execute', appearance: 'interaction-only',
        'response-field': false, retry: 'never',
        callback: (token: string) => settle?.(token),
        'error-callback': () => { settle?.(); return true; },
        'expired-callback': () => settle?.(), 'timeout-callback': () => settle?.(),
      });
      api.reset(widget);
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => settle?.(), 60000);
        settle = token => {
          clearTimeout(timer); settle = undefined;
          if (token) resolve(token); else reject(new Error('Weryfikacja nie powiodła się. Spróbuj ponownie.'));
        };
        container.scrollIntoView({ block: 'nearest' });
        try { api.execute(widget!); } catch { settle?.(); }
      });
    },
    reset() { if (widget !== undefined) window.turnstile?.reset(widget); },
  };
}
