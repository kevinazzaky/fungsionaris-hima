import {
  EnvelopeSimple,
  InstagramLogo,
  MapPin,
  TiktokLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import { DetailHeader } from "@/components/detail/detail-header";

const channels = [
  {
    icon: MapPin,
    title: "Sekretariat",
    body: "Gedung Kampus Undiknas, Denpasar, Bali",
  },
  {
    icon: EnvelopeSimple,
    title: "Email",
    body: "himati@undiknas.ac.id",
    href: "mailto:himati@undiknas.ac.id",
  },
];

const socials = [
  { icon: InstagramLogo, label: "Instagram", handle: "@himati.undiknas", href: "https://instagram.com" },
  { icon: TiktokLogo, label: "TikTok", handle: "@himati.undiknas", href: "https://tiktok.com" },
  { icon: YoutubeLogo, label: "YouTube", handle: "HIMA TI Undiknas", href: "https://youtube.com" },
];

export default function ContactPage() {
  return (
    <>
      <DetailHeader
        title="Hubungi Kami"
        description="Ada pertanyaan seputar organisasi atau ingin berkolaborasi? Sapa kami lewat kanal berikut."
      />

      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <div className="grid gap-5 sm:grid-cols-2">
          {channels.map((item) => (
            <div key={item.title} className="rounded-2xl border border-zinc-200 p-6">
              <item.icon size={24} weight="bold" className="text-amber-500" />
              <h3 className="mt-4 font-bold text-zinc-900">{item.title}</h3>
              {item.href ? (
                <a
                  href={item.href}
                  className="mt-2 inline-block text-sm leading-relaxed text-zinc-600 transition-colors hover:text-amber-600"
                >
                  {item.body}
                </a>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.body}</p>
              )}
            </div>
          ))}
        </div>

        <h2 className="mt-14 text-xl font-bold text-zinc-900">Media Sosial</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-5 transition-colors hover:border-amber-400"
            >
              <social.icon size={22} weight="bold" className="text-zinc-900" />
              <div>
                <p className="text-sm font-semibold text-zinc-900">{social.label}</p>
                <p className="text-xs text-zinc-500">{social.handle}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
