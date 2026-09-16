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
  { icon: InstagramLogo, label: "Instagram", handle: "@himati.undiknas", href: "https://instagram.com/himati.undiknas" },
  { icon: TiktokLogo, label: "TikTok", handle: "@himati.undiknas", href: "https://tiktok.com/@himati.undiknas" },
  { icon: YoutubeLogo, label: "YouTube", handle: "HIMA TI Undiknas", href: "https://youtube.com/@himatiundiknas" },
];

export default function ContactPage() {
  return (
    <>
      <DetailHeader
        title="Hubungi Kami"
        description="Ada pertanyaan seputar organisasi atau ingin berkolaborasi? Sapa kami lewat kanal berikut."
      />

      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <div className="grid gap-6 sm:grid-cols-2">
          {channels.map((item) => (
            <div
              key={item.title}
              className="group rounded-3xl border border-zinc-200/80 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-lg hover:shadow-zinc-200/50"
            >
              <div className="inline-flex rounded-2xl bg-amber-400/15 p-3 text-amber-500 transition-transform duration-300 group-hover:scale-110">
                <item.icon size={26} weight="bold" />
              </div>
              <h3 className="mt-5 font-heading text-lg font-bold text-zinc-900">{item.title}</h3>
              {item.href ? (
                <a
                  href={item.href}
                  className="mt-2 inline-block text-sm leading-relaxed text-zinc-600 transition-colors duration-200 hover:text-amber-600"
                >
                  {item.body}
                </a>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.body}</p>
              )}
            </div>
          ))}
        </div>

        <h2 className="mt-16 font-heading text-xl font-bold text-zinc-900">Media Sosial</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3.5 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-md active:scale-95"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 transition-colors duration-300 group-hover:bg-amber-400 group-hover:text-zinc-950">
                <social.icon size={22} weight="bold" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">{social.label}</p>
                <p className="text-xs text-zinc-500">{social.handle}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
