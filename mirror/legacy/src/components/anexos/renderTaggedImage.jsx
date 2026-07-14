export async function renderTaggedImage(file, tagLines) {
  const imageUrl = URL.createObjectURL(file);
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0);

  const fontSize = Math.max(20, Math.round(canvas.width * 0.022));
  const lineHeight = Math.round(fontSize * 1.35);
  const padding = Math.round(fontSize * 0.9);
  const boxHeight = padding * 2 + lineHeight * tagLines.length;

  ctx.fillStyle = 'rgba(17, 24, 39, 0.72)';
  ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `600 ${fontSize}px "DIN 1451", DINish, system-ui, sans-serif`;
  ctx.textBaseline = 'top';

  tagLines.forEach((line, index) => {
    ctx.fillText(line, padding, canvas.height - boxHeight + padding + index * lineHeight);
  });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  URL.revokeObjectURL(imageUrl);

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '-tag.jpg', { type: 'image/jpeg' });
}