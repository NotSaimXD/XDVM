# XDVM 3

XDVM is a hybrid Linux workspace: launch lightweight environments in the browser with CheerpX, or use native QEMU with KVM acceleration from the desktop app. XDVM is a fork of WebVM by NotSaimXD and keeps the original WebVM attribution and licensing terms.

## What changed

- The release is now version `3.0.0` with a native desktop runtime alongside the browser workspace.
- The launcher now detects host CPU, memory, QEMU availability, and KVM access.
- Desktop packaging supports Windows portable builds and Linux AppImage builds.

## Added

- QEMU launch support for ISO and raw disk images.
- Automatic KVM acceleration on Linux, with multi-threaded TCG fallback.
- Quiet, Balanced, and Workstation device profiles with manual selection.
- A secure Electron preload bridge for host detection, image selection, and VM launch.

## Removed

- The desktop shell is no longer browser-only.
- The misleading native ISO launch path was removed from the browser workflow; ISO boot is handled by native QEMU, while browser images remain CheerpX-compatible `.ext2` files.

No browser virtualization feature was removed. Existing CheerpX routes and browser launches remain available.

WebVM attribution:
## License

WebVM is released under the Apache License, Version 2.0.

You are welcome to use, modify, and redistribute the contents of this repository.

The public CheerpX deployment is provided **as-is** and is **free to use** for technological exploration, testing and use by individuals. Any other use by organizations, including non-profit, academia and the public sector, requires a license. Downloading a CheerpX build for the purpose of hosting it elsewhere is not permitted without a commercial license.

Read more [here](https://cheerpx.io/docs/licensing) about our licensing practices.

If you want to build a product on top of CheerpX/WebVM, please see our other licensing options: [CheerpX licensing](https://cheerpx.io/licensing) or get in touch: sales@leaningtech.com

## Desktop QEMU runtime

The Electron build includes a native QEMU launcher. On Linux it uses KVM automatically when `/dev/kvm` is accessible, and falls back to multi-threaded TCG when it is not. The launcher selects a `Quiet`, `Balanced`, or `Workstation` device profile from the host's CPU and memory, with an explicit override in the desktop UI.

To package QEMU with a desktop build, place the matching `qemu-system-x86_64` executable in `resources/qemu/` (`qemu-system-x86_64.exe` on Windows), then run `npm run desktop:build` for a portable Windows build or `npm run desktop:build:linux` for AppImage. When no bundled binary is present, XDVM looks for `qemu-system-x86_64` on `PATH`.
