import type { Program, ProgramInput } from "../domain/programs";
type SeedProgram = Pick<
  ProgramInput,
  "title" | "body" | "icon" | "status" | "executionDate"
> &
  Partial<ProgramInput> & {
    image: string | null;
    date?: string;
    statusText: string;
    extraDetails?: {
      speakers?: string[];
      benefits?: string[];
      price?: string;
      contactPerson?: string;
    };
  };
const periods: { key: string; label: string; programs: SeedProgram[] }[] = [
  {
    key: "2025-2026",
    label: "2025/2026",
    programs: [
      {
        icon: "microphone",
        title: "Seminar Nasional",
        body: "Pembicara nasional membahas tren teknologi informasi terkini.",
        fullDescription:
          "Kegiatan untuk memperluas pengetahuan dan wawasan mahasiswa mengenai perkembangan di bidang Teknologi Informasi. Seminar ini mendorong pertukaran ide dan inovasi, serta mendukung peningkatan kualitas pendidikan dengan menghadirkan narasumber yang kompeten.",
        image: "/hero/foto-3.jpg",
        executionDate: "12 Maret 2026",
        time: "Selesai Dilaksanakan",
        location: "Auditorium Kampus Undiknas",
        status: "closed",
        statusText: "Pendaftaran Ditutup",
      },
      {
        icon: "code",
        title: "Workshop Web Development",
        body: "Pelatihan intensif 16x pertemuan fundamental website: HTML, CSS, JS, PHP, & Git.",
        fullDescription:
          "Workshop intensif yang diselenggarakan oleh HIMA TI Undiknas untuk mempelajari dasar-dasar pengembangan website dari awal. Mencakup pengenalan konsep web, pembuatan struktur HTML, styling modern CSS, interaktivitas JavaScript, backend dasar PHP, hingga kolaborasi dan version control menggunakan Git & GitHub.",
        image: "/proker/workshop-webdev.jpg",
        date: "17 April - 22 July 2026",
        executionDate: "17 April - 22 July 2026",
        time: "Selesai Dilaksanakan",
        location: "Laboratorium Govinda RnD Undiknas",
        status: "closed",
        statusText: "Pendaftaran Ditutup",
        extraDetails: {
          price: "Gratis (FREE)",
          benefits: ["Knowledge", "Modul Pembelajaran", "Pacar Bisa Ngoding"],
          contactPerson: "Santika (085171702787) / Dedy (081337771929)",
        },
      },
      {
        icon: "broadcast",
        title: "Webinar Nasional",
        body: "The Autonomous Era: Bagaimana Integrasi AIoT Menjadikan Perangkat Berpikir dan Bertindak Otomatis.",
        fullDescription:
          "Webinar Nasional bertajuk 'THE AUTONOMOUS ERA: Bagaimana Integrasi AIoT Menjadikan Perangkat Berpikir dan Bertindak secara Otomatis'. Menghadirkan pembicara ahli untuk mengupas tuntas penerapan nyata kecerdasan buatan dan IoT di industri modern.",
        image: "/proker/webinar-nasional.jpg",
        date: "03 Oktober 2026",
        executionDate: "03 Oktober 2026",
        time: "09:30 WITA",
        location: "Daring via Zoom Meeting",
        status: "closed",
        statusText: "Pendaftaran Ditutup",
        gformLink:
          "https://docs.google.com/forms/d/e/1FAIpQLSe07p0vZgjx1W1NzMpBUGsXfh6TuUE9s6SCmb8aLVM-F8QZnw/viewform",
        extraDetails: {
          speakers: [
            "I Putu Arich Arthawan S.Kom, M.T. (Narasumber 1)",
            "Ni Luh Putu Ika Candrawengi S.Stat., M.Stat. (Narasumber 2)",
            "Ewaldo Zenobia S.Tr.T. (Narasumber 3)",
            "Ir. I Gusti Ngurah Darma Paramartha S.T., M.T., I.P.M. (Moderator)",
          ],
          price: "Rp 25.000 (Early Bird)",
          benefits: [
            "E-Certificate",
            "Pengalaman & Relasi",
            "Wawasan Praktis AIoT",
            "Poin SKP A",
          ],
          contactPerson: "Dhea (0818-0522-8056) / Indah (0822-1344-4798)",
        },
      },
      {
        icon: "heart",
        title: "Kerja Sosial",
        body: "Pengabdian masyarakat di lingkungan sekitar kampus.",
        fullDescription:
          "Bertujuan meningkatkan rasa kepedulian mahasiswa terhadap kehidupan sosial masyarakat, dengan membantu memberikan solusi aplikatif berdasarkan wawasan dan ilmu mahasiswa, sekaligus memperkuat hubungan antara mahasiswa dan masyarakat.",
        image: null,
        executionDate: "Semester Genap 2025/2026",
        time: "Menyesuaikan Jadwal",
        location: "Denpasar dan Sekitarnya",
        status: "upcoming",
        statusText: "Segera Hadir",
      },
      {
        icon: "cake",
        title: "IT Versary",
        body: "Perayaan tahunan Program Studi Teknologi Informasi.",
        fullDescription:
          "Peringatan hari jadi Program Studi Teknologi Informasi yang dirayakan melalui rangkaian kompetisi inovasi mahasiswa, pameran karya teknologi, pentas ekspresi seni, dan keakraban seluruh civitas akademika.",
        image: null,
        executionDate: "Semester Genap 2025/2026",
        time: "Menyesuaikan Jadwal",
        location: "Kampus Undiknas Denpasar",
        status: "upcoming",
        statusText: "Segera Hadir",
      },
    ],
  },
  {
    key: "2024-2025",
    label: "2024/2025",
    programs: [
      {
        icon: "cake",
        title: "IT Versary & Sertijab",
        body: "Perayaan tahunan sekaligus serah terima jabatan kepengurusan.",
        fullDescription:
          "Malam perayaan hari jadi Program Studi TI sekaligus serah terima jabatan (sertijab) kepengurusan HIMA TI periode 2024/2025 kepada penerus tongkat estafet berikutnya.",
        image: "/proker/it-versary.jpg",
        executionDate: "22 Februari 2025",
        time: "Selesai Dilaksanakan",
        location: "Jyooty Villa, Nusa Dua",
        status: "closed",
        statusText: "Pendaftaran Ditutup",
      },
      {
        icon: "microphone",
        title: "Seminar Nasional",
        body: "Pembicara nasional membahas tren teknologi informasi.",
        fullDescription:
          "Seminar nasional inspiratif yang mempertemukan mahasiswa dengan pembicara berpengalaman nasional dalam memahami dinamika dan ekosistem industri teknologi modern.",
        image: "/proker/seminar-nasional.jpg",
        executionDate: "15 Mei 2025",
        time: "Selesai Dilaksanakan",
        location: "Auditorium Undiknas",
        status: "closed",
        statusText: "Pendaftaran Ditutup",
      },
      {
        icon: "heart",
        title: "Kerja Sosial",
        body: "Pengabdian masyarakat di lingkungan sekitar kampus.",
        fullDescription:
          "Aksi sosial mahasiswa TI yang berfokus pada pendampingan masyarakat dan kepedulian lingkungan sekitar guna mempererat relasi mahasiswa dengan warga lokal.",
        image: "/proker/kersos-2025.jpg",
        executionDate: "14 - 15 Agustus 2025",
        time: "Selesai Dilaksanakan",
        location: "SMAN 2 Denpasar",
        status: "closed",
        statusText: "Pendaftaran Ditutup",
      },
      {
        icon: "code",
        title: "IT Bootcamp",
        body: "Pelatihan intensif pengembangan skill teknis mahasiswa.",
        fullDescription:
          "Pelatihan intensif hands-on pemrograman dan pemecahan masalah algoritma untuk meningkatkan kompetensi teknis mahasiswa TI menghadapi kebutuhan industri digital.",
        image: "/proker/it-bootcamp.webp",
        executionDate: "07 - 09 November 2025",
        time: "Selesai Dilaksanakan",
        location: "Agro Puncak Lestari, Bedugul",
        status: "closed",
        statusText: "Pendaftaran Ditutup",
      },
    ],
  },
];
export const initialPrograms: Program[] = periods.flatMap((period) =>
  period.programs.map((program, index) => ({
    id: `program-${period.key}-${index}`,
    period: period.label,
    title: program.title,
    body: program.body,
    fullDescription: program.fullDescription || "",
    icon: program.icon,
    status: program.status,
    executionDate: program.executionDate,
    time: program.time || "",
    location: program.location || "",
    gformLink: program.gformLink || "",
    speakers: program.extraDetails?.speakers || [],
    benefits: program.extraDetails?.benefits || [],
    price: program.extraDetails?.price || "",
    contactPerson: program.extraDetails?.contactPerson || "",
    imagePath: program.image,
    imageUrl: program.image,
    sortOrder: index,
    isPublished: true,
  })),
);
