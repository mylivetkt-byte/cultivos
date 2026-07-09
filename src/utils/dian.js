export function calcularDV(nit) {
  if (!nit || isNaN(nit)) return '';
  
  const vpri = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let x = 0;
  let y = 0;
  let z = nit.length;
  
  for (let i = 0; i < z; i++) {
    y = parseInt(nit.charAt(i), 10);
    x += y * vpri[z - 1 - i];
  }
  
  y = x % 11;
  return y > 1 ? 11 - y : y;
}
