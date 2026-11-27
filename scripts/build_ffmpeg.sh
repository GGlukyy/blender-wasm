#!/usr/bin/env bash
# V2: x264 (stable, GPL) + FFmpeg 7.1 (GPL, bez asm) -> wasm-sysroot. Jen PC build (Lukáš 23. 11.).
set -euo pipefail
source "$(dirname "$0")/dep_common.sh"

# --- x264 ---
x264src="$SRC/x264"
if [ ! -d "$x264src" ]; then
  git clone --depth 1 https://code.videolan.org/videolan/x264.git "$x264src" 2>/dev/null \
    || git clone --depth 1 https://github.com/mirror/x264.git "$x264src"
fi
b="$BLD/x264"; rm -rf "$b"; mkdir -p "$b"; cd "$b"
emconfigure "$x264src/configure" --host=i686-gnu --prefix="$SYSROOT" --enable-static --disable-cli \
  --disable-asm --disable-opencl --disable-avs --disable-swscale --disable-lavf --disable-ffms --disable-gpac --disable-lsmash \
  --extra-cflags="$WASM_CFLAGS" --extra-ldflags="-pthread"
emmake make -j"$NPROC"
emmake make install
mkdir -p "$SYSROOT/lib/pkgconfig"; cp x264.pc "$SYSROOT/lib/pkgconfig/"

# --- FFmpeg ---
src=$(fetch_extract "https://ffmpeg.org/releases/ffmpeg-7.1.tar.xz" "ffmpeg-7.1.tar.xz" "ffmpeg-7.1")
b="$BLD/ffmpeg"; rm -rf "$b"; mkdir -p "$b"; cd "$b"
printf '#!/bin/sh\nPKG_CONFIG_LIBDIR="%s/lib/pkgconfig" exec pkg-config "$@"\n' "$SYSROOT" > "$b/pkgcfg.sh"; chmod +x "$b/pkgcfg.sh"
emconfigure "$src/configure" --prefix="$SYSROOT" --enable-cross-compile --pkg-config="$b/pkgcfg.sh" --target-os=none --arch=x86_32 \
  --cc=emcc --cxx=em++ --ar=emar --ranlib=emranlib --nm=emnm --enable-gpl --enable-libx264 \
  --disable-asm --disable-x86asm --disable-inline-asm --disable-programs --disable-doc --disable-debug \
  --disable-network --disable-autodetect --disable-everything --disable-avdevice --disable-avfilter \
  --disable-postproc --enable-pthreads --enable-static --disable-shared \
  --enable-protocol=file --enable-swscale --enable-swresample \
  --enable-muxer=mp4,matroska,webm,mov,avi,image2,ogg,mpeg1system,mpeg2video,dv,flv \
  --enable-demuxer=mov,matroska,avi,image2,ogg,mpegvideo,mpegps,mpegts,flv,dv,gif,wav,mp3,aac,flac \
  --enable-encoder=libx264,mpeg4,mpeg2video,mpeg1video,mjpeg,png,huffyuv,ffv1,aac,pcm_s16le,pcm_s24le,flac,ac3,mp2 \
  --enable-decoder=h264,hevc,mpeg4,mpeg2video,mpeg1video,mjpeg,png,vp8,vp9,theora,prores,dnxhd,huffyuv,ffv1,aac,mp3,mp2,flac,vorbis,opus,pcm_s16le,pcm_s24le,pcm_f32le,ac3,gif \
  --enable-parser=h264,hevc,mpeg4video,mpegvideo,mjpeg,png,vp8,vp9,aac,mpegaudio,flac,vorbis,opus,ac3 \
  --enable-bsf=h264_mp4toannexb,aac_adtstoasc,extract_extradata,hevc_mp4toannexb \
  --extra-cflags="$WASM_CFLAGS -I$SYSROOT/include" --extra-ldflags="-L$SYSROOT/lib -pthread"
emmake make -j"$NPROC"
emmake make install
ls -la "$SYSROOT"/lib/libav*.a "$SYSROOT"/lib/libsw*.a "$SYSROOT"/lib/libx264.a
