import Image from "next/image";

export function ProfileAvatar() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
      <div className="relative h-[42%] w-[42%] opacity-90">
        <Image
          src="/brand/logo-emblem.png"
          alt=""
          fill
          sizes="120px"
          className="object-contain"
        />
      </div>
    </div>
  );
}
