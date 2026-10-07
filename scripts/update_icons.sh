#!/bin/bash
set -e

RES_DIR="android/app/src/main/res"

# Densities and sizes:
# mdpi: launcher=48, foreground=108
# hdpi: launcher=72, foreground=162
# xhdpi: launcher=96, foreground=216
# xxhdpi: launcher=144, foreground=324
# xxxhdpi: launcher=192, foreground=432

# Master 1024x1024 square icon
convert -size 1024x1024 xc:'#2CA6FF' -fill '#FFFFFF' \
  -draw 'roundrectangle 442,292 582,732 70,70' \
  -draw 'roundrectangle 292,442 732,582 70,70' \
  master_icon.png

# Master 1024x1024 round icon
convert -size 1024x1024 xc:none -fill '#2CA6FF' \
  -draw 'circle 512,512 512,0' \
  -fill '#FFFFFF' \
  -draw 'roundrectangle 442,292 582,732 70,70' \
  -draw 'roundrectangle 292,442 732,582 70,70' \
  master_round.png

# Master 1024x1024 transparent foreground icon (centered inside 66% safe zone)
convert -size 1024x1024 xc:none -fill '#FFFFFF' \
  -draw 'roundrectangle 442,292 582,732 70,70' \
  -draw 'roundrectangle 292,442 732,582 70,70' \
  master_foreground.png

generate_density() {
  local dir=$1
  local size=$2
  local fg_size=$3

  echo "Generating for $dir: launcher=${size}x${size}, foreground=${fg_size}x${fg_size}"
  convert master_icon.png -resize "${size}x${size}" "$RES_DIR/$dir/ic_launcher.png"
  convert master_round.png -resize "${size}x${size}" "$RES_DIR/$dir/ic_launcher_round.png"
  convert master_foreground.png -resize "${fg_size}x${fg_size}" "$RES_DIR/$dir/ic_launcher_foreground.png"
}

generate_density "mipmap-mdpi" 48 108
generate_density "mipmap-hdpi" 72 162
generate_density "mipmap-xhdpi" 96 216
generate_density "mipmap-xxhdpi" 144 324
generate_density "mipmap-xxxhdpi" 192 432

# Also copy 512x512 to public
cp master_icon.png public/app-icon-512.png
cp master_icon.png public/logo.jpg
convert master_icon.png -resize 192x192 public/icon-192.png
convert master_icon.png -resize 512x512 public/icon-512.png

rm master_icon.png master_round.png master_foreground.png
echo "All icons generated successfully!"
