# XDVM 5

XDVM is a hybrid Linux workspace made by NotSaimXD heres it launches lightweight environments in the browser with CheerpX, or use native QEMU with KVM acceleration from the desktop app. XDVM is a fork of WebVM by NotSaimXD and keeps the original WebVM attribution and licensing terms.

## XDVM 5 release

Version `5.0.0` packages the customizable VM hardware controls and protected guest sessions into the Windows installer and portable desktop app.

### Added

- Windows x64 NSIS installer and portable executable build.
- Saved custom RAM and vCPU settings with host-capacity limits.
- Protected snapshot launches so source disk images stay unchanged.
- Live native guest status monitoring.

### Changed

- The installer identifies itself as `XDVM 5`.
- Release artifacts are built on Windows and include QEMU when the release workflow completes.

### Removed

- No browser, Android, QEMU, recording, or VM workflows were removed.

## XDVM 4 release

Version `4.0.0` adds persistent appearance modes and keeps the professional Windows installer and portable VM app packaging from XDVM 3.1.

### Added

- Light, Dark, and System appearance modes in the launcher.
- Theme preference persistence across sessions using local storage.
- Automatic response to the operating system's dark-mode preference when System mode is selected.
- Windows NSIS installer with desktop and Start Menu shortcuts, an uninstall entry, and selectable installation directory.
- Custom native VM hardware controls for RAM and vCPU cores, with saved settings and host-capacity limits.
- Protected snapshot launches that keep the original ISO or disk image unchanged, plus live guest-exit monitoring.

### Changed

- The Windows installer now identifies itself as `XDVM 4`.
- Existing QEMU, Android, raw-image, recording, and browser virtualization features remain available.

### Removed

- No VM runtimes or browser workflows were removed.

## XDVM 3.1 release

Version `3.1.0` adds the Windows portable desktop build pipeline. The GitHub release is built on Windows so the portable `.exe` is a real runnable application rather than a placeholder generated on Linux.

### What changed

- Windows packaging is pinned to an x64 portable target.
- Windows releases include a guided NSIS installer with desktop and Start Menu shortcuts, an uninstall entry, and a selectable installation directory.
- Release artifacts use names such as `XDVM-3.1.0-win-x64.exe`.
- GitHub Actions builds the Windows executable and attaches it to the matching release tag.

### Added

- An in-app capture studio for recording a selected screen or window to WebM, with optional audio, pause/resume, elapsed time, and stop-to-save controls.
- Managed native VM lifecycle controls with launch status, PID visibility, stop support, and guest cleanup when XDVM exits.
- Android PC image support for ISO, raw, QCOW2, VMDK, and VDI files, with virtio GPU, tablet input, KVM acceleration, and TCG fallback. Android Studio is not required.
- A dedicated `desktop:build:windows` command.
- A professional `XDVM Setup 3.1.0.exe` installer alongside the portable executable.
- Automated Windows release workflow for the portable `.exe`.
- Optional bundled QEMU support through `resources/qemu/qemu-system-x86_64.exe`.

### Removed

- No browser features were removed.
- The release process no longer treats a Linux-side cross-build as a Windows executable; Windows packaging runs on a Windows builder.

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

Raw images are supported directly. Files ending in `.raw`, `.img`, or `.bin` are opened as `format=raw`; `.qcow`, `.qcow2`, `.vmdk`, and `.vdi` use their matching QEMU format. QEMU must be installed on the host or included in the desktop package for native launch to work.
