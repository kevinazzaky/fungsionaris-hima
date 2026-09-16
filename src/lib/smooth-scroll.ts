/**
 * Utility untuk scroll halus ke ID section tanpa menambahkan tanda pagar (#) pada URL browser.
 * Jika pengguna sedang berada di halaman lain (misal /fungsionaris), simpan target di sessionStorage
 * dan arahkan ke "/" tanpa tanda pagar pada URL.
 */
export function scrollToSection(
  sectionId: string,
  pathname: string,
  router: { push: (url: string) => void }
) {
  if (pathname === "/") {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    // Pastikan URL tetap bersih tanpa tanda pagar (#)
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  } else {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("scroll_to_section", sectionId);
    }
    router.push("/");
  }
}
