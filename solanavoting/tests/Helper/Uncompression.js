export const to32ByteBuffer = (bigInt) => {
    const hexString = bigInt.toString(16).padStart(64, '0');
    const buffer = Buffer.from(hexString, "hex");
    return buffer;
};

export const g1Uncompressed = (curve, p1Raw) => {
    let p1 = curve.G1.fromObject(p1Raw);
    let buff = new Uint8Array(64);
    curve.G1.toRprUncompressed(buff, 0, p1);
    return buff;
};

export const g2Uncompressed = (curve, p2Raw) => {
    let p2 = curve.G2.fromObject(p2Raw);
    let buff = new Uint8Array(128);
    curve.G2.toRprUncompressed(buff, 0, p2);
    return buff;
};
