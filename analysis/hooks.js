
239666 / hooks - src.js

var Qt = Object.defineProperty; var zi = Object.getOwnPropertyDescriptor; var Vi = Object.getOwnPropertyNames; var Ji = Object.prototype.hasOwnProperty; var te = (t, e) => () => (t && (e = t(t = 0)), e); var Gi = (t, e) => () => (e || t((e = { exports: {} }).exports, e), e.exports), Br = (t, e) => { for (var n in e) Qt(t, n, { get: e[n], enumerable: !0 }) }, $i = (t, e, n, r) => { if (e && typeof e == "object" || typeof e == "function") for (let o of Vi(e)) !Ji.call(t, o) && o !== n && Qt(t, o, { get: () => e[o], enumerable: !(r = zi(e, o)) || r.enumerable }); return t }; var Hi = t => $i(Qt({}, "__esModule", { value: !0 }), t); function Zi(t) { let e = t.length; if (e % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4"); let n = t.indexOf("="); n === -1 && (n = e); let r = n === e ? 0 : 4 - n % 4; return [n, r] } function qi(t, e, n) { return (e + n) * 3 / 4 - n } function zr(t) { let e = Zi(t), n = e[0], r = e[1], o = new Uint8Array(qi(t, n, r)), i = 0, s = r > 0 ? n - 4 : n, l; for (l = 0; l < s; l += 4) { let a = ve[t.charCodeAt(l)] << 18 | ve[t.charCodeAt(l + 1)] << 12 | ve[t.charCodeAt(l + 2)] << 6 | ve[t.charCodeAt(l + 3)]; o[i++] = a >> 16 & 255, o[i++] = a >> 8 & 255, o[i++] = a & 255 } if (r === 2) { let a = ve[t.charCodeAt(l)] << 2 | ve[t.charCodeAt(l + 1)] >> 4; o[i++] = a & 255 } if (r === 1) { let a = ve[t.charCodeAt(l)] << 10 | ve[t.charCodeAt(l + 1)] << 4 | ve[t.charCodeAt(l + 2)] >> 2; o[i++] = a >> 8 & 255, o[i++] = a & 255 } return o } function Wi(t) { return Te[t >> 18 & 63] + Te[t >> 12 & 63] + Te[t >> 6 & 63] + Te[t & 63] } function Ki(t, e, n) { let r = []; for (let o = e; o < n; o += 3) { let i = (t[o] << 16 & 16711680) + (t[o + 1] << 8 & 65280) + (t[o + 2] & 255); r.push(Wi(i)) } return r.join("") } function Xt(t) { let e = t.length, n = e % 3, r = [], o = 16383; for (let i = 0, s = e - n; i < s; i += o)r.push(Ki(t, i, i + o > s ? s : i + o)); if (n === 1) { let i = t[e - 1]; r.push(Te[i >> 2] + Te[i << 4 & 63] + "==") } else if (n === 2) { let i = (t[e - 2] << 8) + t[e - 1]; r.push(Te[i >> 10] + Te[i >> 4 & 63] + Te[i << 2 & 63] + "=") } return r.join("") } var Te, ve, Yt, Vr = te(() => { U(); Te = [], ve = [], Yt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"; for (let t = 0, e = Yt.length; t < e; ++t)Te[t] = Yt[t], ve[Yt.charCodeAt(t)] = t; ve[45] = 62; ve[95] = 63 }); function it(t, e, n, r, o) { let i, s, l = o * 8 - r - 1, a = (1 << l) - 1, c = a >> 1, d = -7, p = n ? o - 1 : 0, f = n ? -1 : 1, u = t[e + p]; for (p += f, i = u & (1 << -d) - 1, u >>= -d, d += l; d > 0;)i = i * 256 + t[e + p], p += f, d -= 8; for (s = i & (1 << -d) - 1, i >>= -d, d += r; d > 0;)s = s * 256 + t[e + p], p += f, d -= 8; if (i === 0) i = 1 - c; else { if (i === a) return s ? NaN : (u ? -1 : 1) * (1 / 0); s = s + Math.pow(2, r), i = i - c } return (u ? -1 : 1) * s * Math.pow(2, i - r) } function en(t, e, n, r, o, i) { let s, l, a, c = i * 8 - o - 1, d = (1 << c) - 1, p = d >> 1, f = o === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, u = r ? 0 : i - 1, _ = r ? 1 : -1, h = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0; for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (l = isNaN(e) ? 1 : 0, s = d) : (s = Math.floor(Math.log(e) / Math.LN2), e * (a = Math.pow(2, -s)) < 1 && (s--, a *= 2), s + p >= 1 ? e += f / a : e += f * Math.pow(2, 1 - p), e * a >= 2 && (s++, a /= 2), s + p >= d ? (l = 0, s = d) : s + p >= 1 ? (l = (e * a - 1) * Math.pow(2, o), s = s + p) : (l = e * Math.pow(2, p - 1) * Math.pow(2, o), s = 0)); o >= 8;)t[n + u] = l & 255, u += _, l /= 256, o -= 8; for (s = s << o | l, c += o; c > 0;)t[n + u] = s & 255, u += _, s /= 256, c -= 8; t[n + u - _] |= h * 128 } var Jr = te(() => { U(); }); function Ne(t) { if (t > tn) throw new RangeError('The value "' + t + '" is invalid for option "size"'); let e = new Uint8Array(t); return Object.setPrototypeOf(e, m.prototype), e } function m(t, e, n) { if (typeof t == "number") { if (typeof e == "string") throw new TypeError('The "string" argument must be of type string. Received type number'); return sn(t) } return Zr(t, e, n) } function Zr(t, e, n) { if (typeof t == "string") return ts(t, e); if (ArrayBuffer.isView(t)) return ns(t); if (t == null) throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof t); if (t instanceof ArrayBuffer || t && t.buffer instanceof ArrayBuffer || t instanceof SharedArrayBuffer || t && t.buffer instanceof SharedArrayBuffer) return rn(t, e, n); if (typeof t == "number") throw new TypeError('The "value" argument must not be of type number. Received type number'); let r = t.valueOf && t.valueOf(); if (r != null && r !== t) return m.from(r, e, n); let o = rs(t); if (o) return o; if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof t[Symbol.toPrimitive] == "function") return m.from(t[Symbol.toPrimitive]("string"), e, n); throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof t) } function qr(t) { if (typeof t != "number") throw new TypeError('"size" argument must be of type number'); if (t < 0) throw new RangeError('The value "' + t + '" is invalid for option "size"') } function es(t, e, n) { return qr(t), t <= 0 ? Ne(t) : e !== void 0 ? typeof n == "string" ? Ne(t).fill(e, n) : Ne(t).fill(e) : Ne(t) } function sn(t) { return qr(t), Ne(t < 0 ? 0 : an(t) | 0) } function ts(t, e) { if ((typeof e != "string" || e === "") && (e = "utf8"), !m.isEncoding(e)) throw new TypeError("Unknown encoding: " + e); let n = Wr(t, e) | 0, r = Ne(n), o = r.write(t, e); return o !== n && (r = r.slice(0, o)), r } function nn(t) { let e = t.length < 0 ? 0 : an(t.length) | 0, n = Ne(e); for (let r = 0; r < e; r += 1)n[r] = t[r] & 255; return n } function ns(t) { if (t instanceof Uint8Array) { let e = new Uint8Array(t); return rn(e.buffer, e.byteOffset, e.byteLength) } return nn(t) } function rn(t, e, n) { if (e < 0 || t.byteLength < e) throw new RangeError('"offset" is outside of buffer bounds'); if (t.byteLength < e + (n || 0)) throw new RangeError('"length" is outside of buffer bounds'); let r; return e === void 0 && n === void 0 ? r = new Uint8Array(t) : n === void 0 ? r = new Uint8Array(t, e) : r = new Uint8Array(t, e, n), Object.setPrototypeOf(r, m.prototype), r } function rs(t) { if (m.isBuffer(t)) { let e = an(t.length) | 0, n = Ne(e); return n.length === 0 || t.copy(n, 0, 0, e), n } if (t.length !== void 0) return typeof t.length != "number" || Number.isNaN(t.length) ? Ne(0) : nn(t); if (t.type === "Buffer" && Array.isArray(t.data)) return nn(t.data) } function an(t) { if (t >= tn) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + tn.toString(16) + " bytes"); return t | 0 } function Wr(t, e) { if (m.isBuffer(t)) return t.length; if (ArrayBuffer.isView(t) || t instanceof ArrayBuffer) return t.byteLength; if (typeof t != "string") throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof t); let n = t.length, r = arguments.length > 2 && arguments[2] === !0; if (!r && n === 0) return 0; let o = !1; for (; ;)switch (e) { case "ascii": case "latin1": case "binary": return n; case "utf8": case "utf-8": return on(t).length; case "ucs2": case "ucs-2": case "utf16le": case "utf-16le": return n * 2; case "hex": return n >>> 1; case "base64": return oo(t).length; default: if (o) return r ? -1 : on(t).length; e = ("" + e).toLowerCase(), o = !0 } } function os(t, e, n) { let r = !1; if ((e === void 0 || e < 0) && (e = 0), e > this.length || ((n === void 0 || n > this.length) && (n = this.length), n <= 0) || (n >>>= 0, e >>>= 0, n <= e)) return ""; for (t || (t = "utf8"); ;)switch (t) { case "hex": return hs(this, e, n); case "utf8": case "utf-8": return Qr(this, e, n); case "ascii": return ps(this, e, n); case "latin1": case "binary": return fs(this, e, n); case "base64": return ds(this, e, n); case "ucs2": case "ucs-2": case "utf16le": case "utf-16le": return _s(this, e, n); default: if (r) throw new TypeError("Unknown encoding: " + t); t = (t + "").toLowerCase(), r = !0 } } function Ue(t, e, n) { let r = t[e]; t[e] = t[n], t[n] = r } function Kr(t, e, n, r, o) { if (t.length === 0) return -1; if (typeof n == "string" ? (r = n, n = 0) : n > 2147483647 ? n = 2147483647 : n < -2147483648 && (n = -2147483648), n = +n, Number.isNaN(n) && (n = o ? 0 : t.length - 1), n < 0 && (n = t.length + n), n >= t.length) { if (o) return -1; n = t.length - 1 } else if (n < 0) if (o) n = 0; else return -1; if (typeof e == "string" && (e = m.from(e, r)), m.isBuffer(e)) return e.length === 0 ? -1 : Gr(t, e, n, r, o); if (typeof e == "number") return e = e & 255, typeof Uint8Array.prototype.indexOf == "function" ? o ? Uint8Array.prototype.indexOf.call(t, e, n) : Uint8Array.prototype.lastIndexOf.call(t, e, n) : Gr(t, [e], n, r, o); throw new TypeError("val must be string, number or Buffer") } function Gr(t, e, n, r, o) { let i = 1, s = t.length, l = e.length; if (r !== void 0 && (r = String(r).toLowerCase(), r === "ucs2" || r === "ucs-2" || r === "utf16le" || r === "utf-16le")) { if (t.length < 2 || e.length < 2) return -1; i = 2, s /= 2, l /= 2, n /= 2 } function a(d, p) { return i === 1 ? d[p] : d.readUInt16BE(p * i) } let c; if (o) { let d = -1; for (c = n; c < s; c++)if (a(t, c) === a(e, d === -1 ? 0 : c - d)) { if (d === -1 && (d = c), c - d + 1 === l) return d * i } else d !== -1 && (c -= c - d), d = -1 } else for (n + l > s && (n = s - l), c = n; c >= 0; c--) { let d = !0; for (let p = 0; p < l; p++)if (a(t, c + p) !== a(e, p)) { d = !1; break } if (d) return c } return -1 } function is(t, e, n, r) { n = Number(n) || 0; let o = t.length - n; r ? (r = Number(r), r > o && (r = o)) : r = o; let i = e.length; r > i / 2 && (r = i / 2); let s; for (s = 0; s < r; ++s) { let l = parseInt(e.substr(s * 2, 2), 16); if (Number.isNaN(l)) return s; t[n + s] = l } return s } function ss(t, e, n, r) { return Ct(on(e, t.length - n), t, n, r) } function as(t, e, n, r) { return Ct(ys(e), t, n, r) } function ls(t, e, n, r) { return Ct(oo(e), t, n, r) } function cs(t, e, n, r) { return Ct(Es(e, t.length - n), t, n, r) } function ds(t, e, n) { return e === 0 && n === t.length ? Xt(t) : Xt(t.slice(e, n)) } function Qr(t, e, n) { n = Math.min(t.length, n); let r = [], o = e; for (; o < n;) { let i = t[o], s = null, l = i > 239 ? 4 : i > 223 ? 3 : i > 191 ? 2 : 1; if (o + l <= n) { let a, c, d, p; switch (l) { case 1: i < 128 && (s = i); break; case 2: a = t[o + 1], (a & 192) === 128 && (p = (i & 31) << 6 | a & 63, p > 127 && (s = p)); break; case 3: a = t[o + 1], c = t[o + 2], (a & 192) === 128 && (c & 192) === 128 && (p = (i & 15) << 12 | (a & 63) << 6 | c & 63, p > 2047 && (p < 55296 || p > 57343) && (s = p)); break; case 4: a = t[o + 1], c = t[o + 2], d = t[o + 3], (a & 192) === 128 && (c & 192) === 128 && (d & 192) === 128 && (p = (i & 15) << 18 | (a & 63) << 12 | (c & 63) << 6 | d & 63, p > 65535 && p < 1114112 && (s = p)) } } s === null ? (s = 65533, l = 1) : s > 65535 && (s -= 65536, r.push(s >>> 10 & 1023 | 55296), s = 56320 | s & 1023), r.push(s), o += l } return us(r) } function us(t) { let e = t.length; if (e <= $r) return String.fromCharCode.apply(String, t); let n = "", r = 0; for (; r < e;)n += String.fromCharCode.apply(String, t.slice(r, r += $r)); return n } function ps(t, e, n) { let r = ""; n = Math.min(t.length, n); for (let o = e; o < n; ++o)r += String.fromCharCode(t[o] & 127); return r } function fs(t, e, n) { let r = ""; n = Math.min(t.length, n); for (let o = e; o < n; ++o)r += String.fromCharCode(t[o]); return r } function hs(t, e, n) { let r = t.length; (!e || e < 0) && (e = 0), (!n || n < 0 || n > r) && (n = r); let o = ""; for (let i = e; i < n; ++i)o += vs[t[i]]; return o } function _s(t, e, n) { let r = t.slice(e, n), o = ""; for (let i = 0; i < r.length - 1; i += 2)o += String.fromCharCode(r[i] + r[i + 1] * 256); return o } function le(t, e, n) { if (t % 1 !== 0 || t < 0) throw new RangeError("offset is not uint"); if (t + e > n) throw new RangeError("Trying to access beyond buffer length") } function _e(t, e, n, r, o, i) { if (!m.isBuffer(t)) throw new TypeError('"buffer" argument must be a Buffer instance'); if (e > o || e < i) throw new RangeError('"value" argument is out of bounds'); if (n + r > t.length) throw new RangeError("Index out of range") } function Yr(t, e, n, r, o) { ro(e, r, o, t, n, 7); let i = Number(e & BigInt(4294967295)); t[n++] = i, i = i >> 8, t[n++] = i, i = i >> 8, t[n++] = i, i = i >> 8, t[n++] = i; let s = Number(e >> BigInt(32) & BigInt(4294967295)); return t[n++] = s, s = s >> 8, t[n++] = s, s = s >> 8, t[n++] = s, s = s >> 8, t[n++] = s, n } function Xr(t, e, n, r, o) { ro(e, r, o, t, n, 7); let i = Number(e & BigInt(4294967295)); t[n + 7] = i, i = i >> 8, t[n + 6] = i, i = i >> 8, t[n + 5] = i, i = i >> 8, t[n + 4] = i; let s = Number(e >> BigInt(32) & BigInt(4294967295)); return t[n + 3] = s, s = s >> 8, t[n + 2] = s, s = s >> 8, t[n + 1] = s, s = s >> 8, t[n] = s, n + 8 } function eo(t, e, n, r, o, i) { if (n + r > t.length) throw new RangeError("Index out of range"); if (n < 0) throw new RangeError("Index out of range") } function to(t, e, n, r, o) { return e = +e, n = n >>> 0, o || eo(t, e, n, 4, 34028234663852886e22, -34028234663852886e22), en(t, e, n, r, 23, 4), n + 4 } function no(t, e, n, r, o) { return e = +e, n = n >>> 0, o || eo(t, e, n, 8, 17976931348623157e292, -17976931348623157e292), en(t, e, n, r, 52, 8), n + 8 } function ln(t, e, n) { Ze[t] = class extends n { constructor() { super(), Object.defineProperty(this, "message", { value: e.apply(this, arguments), writable: !0, configurable: !0 }), this.name = `${this.name} [${t}]`, this.stack, delete this.name } get code() { return t } set code(o) { Object.defineProperty(this, "code", { configurable: !0, enumerable: !0, value: o, writable: !0 }) } toString() { return `${this.name} [${t}]: ${this.message}` } } } function Hr(t) { let e = "", n = t.length, r = t[0] === "-" ? 1 : 0; for (; n >= r + 4; n -= 3)e = `_${t.slice(n - 3, n)}${e}`; return `${t.slice(0, n)}${e}` } function ms(t, e, n) { qe(e, "offset"), (t[e] === void 0 || t[e + n] === void 0) && st(e, t.length - (n + 1)) } function ro(t, e, n, r, o, i) { if (t > n || t < e) { let s = typeof e == "bigint" ? "n" : "", l; throw i > 3 ? e === 0 || e === BigInt(0) ? l = `>= 0${s} and < 2${s} ** ${(i + 1) * 8}${s}` : l = `>= -(2${s} ** ${(i + 1) * 8 - 1}${s}) and < 2 ** ${(i + 1) * 8 - 1}${s}` : l = `>= ${e}${s} and <= ${n}${s}`, new Ze.ERR_OUT_OF_RANGE("value", l, t) } ms(r, o, i) } function qe(t, e) { if (typeof t != "number") throw new Ze.ERR_INVALID_ARG_TYPE(e, "number", t) } function st(t, e, n) { throw Math.floor(t) !== t ? (qe(t, n), new Ze.ERR_OUT_OF_RANGE(n || "offset", "an integer", t)) : e < 0 ? new Ze.ERR_BUFFER_OUT_OF_BOUNDS : new Ze.ERR_OUT_OF_RANGE(n || "offset", `>= ${n ? 1 : 0} and <= ${e}`, t) } function bs(t) { if (t = t.split("=")[0], t = t.trim().replace(gs, ""), t.length < 2) return ""; for (; t.length % 4 !== 0;)t = t + "="; return t } function on(t, e) { e = e || 1 / 0; let n, r = t.length, o = null, i = []; for (let s = 0; s < r; ++s) { if (n = t.charCodeAt(s), n > 55295 && n < 57344) { if (!o) { if (n > 56319) { (e -= 3) > -1 && i.push(239, 191, 189); continue } else if (s + 1 === r) { (e -= 3) > -1 && i.push(239, 191, 189); continue } o = n; continue } if (n < 56320) { (e -= 3) > -1 && i.push(239, 191, 189), o = n; continue } n = (o - 55296 << 10 | n - 56320) + 65536 } else o && (e -= 3) > -1 && i.push(239, 191, 189); if (o = null, n < 128) { if ((e -= 1) < 0) break; i.push(n) } else if (n < 2048) { if ((e -= 2) < 0) break; i.push(n >> 6 | 192, n & 63 | 128) } else if (n < 65536) { if ((e -= 3) < 0) break; i.push(n >> 12 | 224, n >> 6 & 63 | 128, n & 63 | 128) } else if (n < 1114112) { if ((e -= 4) < 0) break; i.push(n >> 18 | 240, n >> 12 & 63 | 128, n >> 6 & 63 | 128, n & 63 | 128) } else throw new Error("Invalid code point") } return i } function ys(t) { let e = []; for (let n = 0; n < t.length; ++n)e.push(t.charCodeAt(n) & 255); return e } function Es(t, e) { let n, r, o, i = []; for (let s = 0; s < t.length && !((e -= 2) < 0); ++s)n = t.charCodeAt(s), r = n >> 8, o = n % 256, i.push(o), i.push(r); return i } function oo(t) { return zr(bs(t)) } function Ct(t, e, n, r) { let o; for (o = 0; o < r && !(o + n >= e.length || o >= t.length); ++o)e[o + n] = t[o]; return o } var Xi, tn, $r, Ze, gs, vs, io = te(() => { U(); Vr(); Jr(); Xi = { INSPECT_MAX_BYTES: 50 }, tn = 2147483647; m.TYPED_ARRAY_SUPPORT = !0; Object.defineProperty(m.prototype, "parent", { enumerable: !0, get: function () { if (m.isBuffer(this)) return this.buffer } }); Object.defineProperty(m.prototype, "offset", { enumerable: !0, get: function () { if (m.isBuffer(this)) return this.byteOffset } }); m.poolSize = 8192; m.from = function (t, e, n) { return Zr(t, e, n) }; Object.setPrototypeOf(m.prototype, Uint8Array.prototype); Object.setPrototypeOf(m, Uint8Array); m.alloc = function (t, e, n) { return es(t, e, n) }; m.allocUnsafe = function (t) { return sn(t) }; m.allocUnsafeSlow = function (t) { return sn(t) }; m.isBuffer = function (e) { return e != null && e._isBuffer === !0 && e !== m.prototype }; m.compare = function (e, n) { if (e instanceof Uint8Array && (e = m.from(e, e.offset, e.byteLength)), n instanceof Uint8Array && (n = m.from(n, n.offset, n.byteLength)), !m.isBuffer(e) || !m.isBuffer(n)) throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'); if (e === n) return 0; let r = e.length, o = n.length; for (let i = 0, s = Math.min(r, o); i < s; ++i)if (e[i] !== n[i]) { r = e[i], o = n[i]; break } return r < o ? -1 : o < r ? 1 : 0 }; m.isEncoding = function (e) { switch (String(e).toLowerCase()) { case "hex": case "utf8": case "utf-8": case "ascii": case "latin1": case "binary": case "base64": case "ucs2": case "ucs-2": case "utf16le": case "utf-16le": return !0; default: return !1 } }; m.concat = function (e, n) { if (!Array.isArray(e)) throw new TypeError('"list" argument must be an Array of Buffers'); if (e.length === 0) return m.alloc(0); let r; if (n === void 0) for (n = 0, r = 0; r < e.length; ++r)n += e[r].length; let o = m.allocUnsafe(n), i = 0; for (r = 0; r < e.length; ++r) { let s = e[r]; if (s instanceof Uint8Array) i + s.length > o.length ? (m.isBuffer(s) || (s = m.from(s.buffer, s.byteOffset, s.byteLength)), s.copy(o, i)) : Uint8Array.prototype.set.call(o, s, i); else if (m.isBuffer(s)) s.copy(o, i); else throw new TypeError('"list" argument must be an Array of Buffers'); i += s.length } return o }; m.byteLength = Wr; m.prototype._isBuffer = !0; m.prototype.swap16 = function () { let e = this.length; if (e % 2 !== 0) throw new RangeError("Buffer size must be a multiple of 16-bits"); for (let n = 0; n < e; n += 2)Ue(this, n, n + 1); return this }; m.prototype.swap32 = function () { let e = this.length; if (e % 4 !== 0) throw new RangeError("Buffer size must be a multiple of 32-bits"); for (let n = 0; n < e; n += 4)Ue(this, n, n + 3), Ue(this, n + 1, n + 2); return this }; m.prototype.swap64 = function () { let e = this.length; if (e % 8 !== 0) throw new RangeError("Buffer size must be a multiple of 64-bits"); for (let n = 0; n < e; n += 8)Ue(this, n, n + 7), Ue(this, n + 1, n + 6), Ue(this, n + 2, n + 5), Ue(this, n + 3, n + 4); return this }; m.prototype.toString = function () { let e = this.length; return e === 0 ? "" : arguments.length === 0 ? Qr(this, 0, e) : os.apply(this, arguments) }; m.prototype.toLocaleString = m.prototype.toString; m.prototype.equals = function (e) { if (!m.isBuffer(e)) throw new TypeError("Argument must be a Buffer"); return this === e ? !0 : m.compare(this, e) === 0 }; m.prototype.inspect = function () { let e = "", n = Xi.INSPECT_MAX_BYTES; return e = this.toString("hex", 0, n).replace(/(.{2})/g, "$1 ").trim(), this.length > n && (e += " ... "), "<Buffer " + e + ">" }; m.prototype[Symbol.for("nodejs.util.inspect.custom")] = m.prototype.inspect; m.prototype.compare = function (e, n, r, o, i) { if (e instanceof Uint8Array && (e = m.from(e, e.offset, e.byteLength)), !m.isBuffer(e)) throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof e); if (n === void 0 && (n = 0), r === void 0 && (r = e ? e.length : 0), o === void 0 && (o = 0), i === void 0 && (i = this.length), n < 0 || r > e.length || o < 0 || i > this.length) throw new RangeError("out of range index"); if (o >= i && n >= r) return 0; if (o >= i) return -1; if (n >= r) return 1; if (n >>>= 0, r >>>= 0, o >>>= 0, i >>>= 0, this === e) return 0; let s = i - o, l = r - n, a = Math.min(s, l), c = this.slice(o, i), d = e.slice(n, r); for (let p = 0; p < a; ++p)if (c[p] !== d[p]) { s = c[p], l = d[p]; break } return s < l ? -1 : l < s ? 1 : 0 }; m.prototype.includes = function (e, n, r) { return this.indexOf(e, n, r) !== -1 }; m.prototype.indexOf = function (e, n, r) { return Kr(this, e, n, r, !0) }; m.prototype.lastIndexOf = function (e, n, r) { return Kr(this, e, n, r, !1) }; m.prototype.write = function (e, n, r, o) { if (n === void 0) o = "utf8", r = this.length, n = 0; else if (r === void 0 && typeof n == "string") o = n, r = this.length, n = 0; else if (isFinite(n)) n = n >>> 0, isFinite(r) ? (r = r >>> 0, o === void 0 && (o = "utf8")) : (o = r, r = void 0); else throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported"); let i = this.length - n; if ((r === void 0 || r > i) && (r = i), e.length > 0 && (r < 0 || n < 0) || n > this.length) throw new RangeError("Attempt to write outside buffer bounds"); o || (o = "utf8"); let s = !1; for (; ;)switch (o) { case "hex": return is(this, e, n, r); case "utf8": case "utf-8": return ss(this, e, n, r); case "ascii": case "latin1": case "binary": return as(this, e, n, r); case "base64": return ls(this, e, n, r); case "ucs2": case "ucs-2": case "utf16le": case "utf-16le": return cs(this, e, n, r); default: if (s) throw new TypeError("Unknown encoding: " + o); o = ("" + o).toLowerCase(), s = !0 } }; m.prototype.toJSON = function () { return { type: "Buffer", data: Array.prototype.slice.call(this._arr || this, 0) } }; $r = 4096; m.prototype.slice = function (e, n) { let r = this.length; e = ~~e, n = n === void 0 ? r : ~~n, e < 0 ? (e += r, e < 0 && (e = 0)) : e > r && (e = r), n < 0 ? (n += r, n < 0 && (n = 0)) : n > r && (n = r), n < e && (n = e); let o = this.subarray(e, n); return Object.setPrototypeOf(o, m.prototype), o }; m.prototype.readUintLE = m.prototype.readUIntLE = function (e, n, r) { e = e >>> 0, n = n >>> 0, r || le(e, n, this.length); let o = this[e], i = 1, s = 0; for (; ++s < n && (i *= 256);)o += this[e + s] * i; return o }; m.prototype.readUintBE = m.prototype.readUIntBE = function (e, n, r) { e = e >>> 0, n = n >>> 0, r || le(e, n, this.length); let o = this[e + --n], i = 1; for (; n > 0 && (i *= 256);)o += this[e + --n] * i; return o }; m.prototype.readUint8 = m.prototype.readUInt8 = function (e, n) { return e = e >>> 0, n || le(e, 1, this.length), this[e] }; m.prototype.readUint16LE = m.prototype.readUInt16LE = function (e, n) { return e = e >>> 0, n || le(e, 2, this.length), this[e] | this[e + 1] << 8 }; m.prototype.readUint16BE = m.prototype.readUInt16BE = function (e, n) { return e = e >>> 0, n || le(e, 2, this.length), this[e] << 8 | this[e + 1] }; m.prototype.readUint32LE = m.prototype.readUInt32LE = function (e, n) { return e = e >>> 0, n || le(e, 4, this.length), (this[e] | this[e + 1] << 8 | this[e + 2] << 16) + this[e + 3] * 16777216 }; m.prototype.readUint32BE = m.prototype.readUInt32BE = function (e, n) { return e = e >>> 0, n || le(e, 4, this.length), this[e] * 16777216 + (this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3]) }; m.prototype.readBigUInt64LE = function (e) { e = e >>> 0, qe(e, "offset"); let n = this[e], r = this[e + 7]; (n === void 0 || r === void 0) && st(e, this.length - 8); let o = n + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24, i = this[++e] + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + r * 2 ** 24; return BigInt(o) + (BigInt(i) << BigInt(32)) }; m.prototype.readBigUInt64BE = function (e) { e = e >>> 0, qe(e, "offset"); let n = this[e], r = this[e + 7]; (n === void 0 || r === void 0) && st(e, this.length - 8); let o = n * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e], i = this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + r; return (BigInt(o) << BigInt(32)) + BigInt(i) }; m.prototype.readIntLE = function (e, n, r) { e = e >>> 0, n = n >>> 0, r || le(e, n, this.length); let o = this[e], i = 1, s = 0; for (; ++s < n && (i *= 256);)o += this[e + s] * i; return i *= 128, o >= i && (o -= Math.pow(2, 8 * n)), o }; m.prototype.readIntBE = function (e, n, r) { e = e >>> 0, n = n >>> 0, r || le(e, n, this.length); let o = n, i = 1, s = this[e + --o]; for (; o > 0 && (i *= 256);)s += this[e + --o] * i; return i *= 128, s >= i && (s -= Math.pow(2, 8 * n)), s }; m.prototype.readInt8 = function (e, n) { return e = e >>> 0, n || le(e, 1, this.length), this[e] & 128 ? (255 - this[e] + 1) * -1 : this[e] }; m.prototype.readInt16LE = function (e, n) { e = e >>> 0, n || le(e, 2, this.length); let r = this[e] | this[e + 1] << 8; return r & 32768 ? r | 4294901760 : r }; m.prototype.readInt16BE = function (e, n) { e = e >>> 0, n || le(e, 2, this.length); let r = this[e + 1] | this[e] << 8; return r & 32768 ? r | 4294901760 : r }; m.prototype.readInt32LE = function (e, n) { return e = e >>> 0, n || le(e, 4, this.length), this[e] | this[e + 1] << 8 | this[e + 2] << 16 | this[e + 3] << 24 }; m.prototype.readInt32BE = function (e, n) { return e = e >>> 0, n || le(e, 4, this.length), this[e] << 24 | this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3] }; m.prototype.readBigInt64LE = function (e) { e = e >>> 0, qe(e, "offset"); let n = this[e], r = this[e + 7]; (n === void 0 || r === void 0) && st(e, this.length - 8); let o = this[e + 4] + this[e + 5] * 2 ** 8 + this[e + 6] * 2 ** 16 + (r << 24); return (BigInt(o) << BigInt(32)) + BigInt(n + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24) }; m.prototype.readBigInt64BE = function (e) { e = e >>> 0, qe(e, "offset"); let n = this[e], r = this[e + 7]; (n === void 0 || r === void 0) && st(e, this.length - 8); let o = (n << 24) + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e]; return (BigInt(o) << BigInt(32)) + BigInt(this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + r) }; m.prototype.readFloatLE = function (e, n) { return e = e >>> 0, n || le(e, 4, this.length), it(this, e, !0, 23, 4) }; m.prototype.readFloatBE = function (e, n) { return e = e >>> 0, n || le(e, 4, this.length), it(this, e, !1, 23, 4) }; m.prototype.readDoubleLE = function (e, n) { return e = e >>> 0, n || le(e, 8, this.length), it(this, e, !0, 52, 8) }; m.prototype.readDoubleBE = function (e, n) { return e = e >>> 0, n || le(e, 8, this.length), it(this, e, !1, 52, 8) }; m.prototype.writeUintLE = m.prototype.writeUIntLE = function (e, n, r, o) { if (e = +e, n = n >>> 0, r = r >>> 0, !o) { let l = Math.pow(2, 8 * r) - 1; _e(this, e, n, r, l, 0) } let i = 1, s = 0; for (this[n] = e & 255; ++s < r && (i *= 256);)this[n + s] = e / i & 255; return n + r }; m.prototype.writeUintBE = m.prototype.writeUIntBE = function (e, n, r, o) { if (e = +e, n = n >>> 0, r = r >>> 0, !o) { let l = Math.pow(2, 8 * r) - 1; _e(this, e, n, r, l, 0) } let i = r - 1, s = 1; for (this[n + i] = e & 255; --i >= 0 && (s *= 256);)this[n + i] = e / s & 255; return n + r }; m.prototype.writeUint8 = m.prototype.writeUInt8 = function (e, n, r) { return e = +e, n = n >>> 0, r || _e(this, e, n, 1, 255, 0), this[n] = e & 255, n + 1 }; m.prototype.writeUint16LE = m.prototype.writeUInt16LE = function (e, n, r) { return e = +e, n = n >>> 0, r || _e(this, e, n, 2, 65535, 0), this[n] = e & 255, this[n + 1] = e >>> 8, n + 2 }; m.prototype.writeUint16BE = m.prototype.writeUInt16BE = function (e, n, r) { return e = +e, n = n >>> 0, r || _e(this, e, n, 2, 65535, 0), this[n] = e >>> 8, this[n + 1] = e & 255, n + 2 }; m.prototype.writeUint32LE = m.prototype.writeUInt32LE = function (e, n, r) { return e = +e, n = n >>> 0, r || _e(this, e, n, 4, 4294967295, 0), this[n + 3] = e >>> 24, this[n + 2] = e >>> 16, this[n + 1] = e >>> 8, this[n] = e & 255, n + 4 }; m.prototype.writeUint32BE = m.prototype.writeUInt32BE = function (e, n, r) { return e = +e, n = n >>> 0, r || _e(this, e, n, 4, 4294967295, 0), this[n] = e >>> 24, this[n + 1] = e >>> 16, this[n + 2] = e >>> 8, this[n + 3] = e & 255, n + 4 }; m.prototype.writeBigUInt64LE = function (e, n = 0) { return Yr(this, e, n, BigInt(0), BigInt("0xffffffffffffffff")) }; m.prototype.writeBigUInt64BE = function (e, n = 0) { return Xr(this, e, n, BigInt(0), BigInt("0xffffffffffffffff")) }; m.prototype.writeIntLE = function (e, n, r, o) { if (e = +e, n = n >>> 0, !o) { let a = Math.pow(2, 8 * r - 1); _e(this, e, n, r, a - 1, -a) } let i = 0, s = 1, l = 0; for (this[n] = e & 255; ++i < r && (s *= 256);)e < 0 && l === 0 && this[n + i - 1] !== 0 && (l = 1), this[n + i] = (e / s >> 0) - l & 255; return n + r }; m.prototype.writeIntBE = function (e, n, r, o) { if (e = +e, n = n >>> 0, !o) { let a = Math.pow(2, 8 * r - 1); _e(this, e, n, r, a - 1, -a) } let i = r - 1, s = 1, l = 0; for (this[n + i] = e & 255; --i >= 0 && (s *= 256);)e < 0 && l === 0 && this[n + i + 1] !== 0 && (l = 1), this[n + i] = (e / s >> 0) - l & 255; return n + r }; m.prototype.writeInt8 = function (e, n, r) { return e = +e, n = n >>> 0, r || _e(this, e, n, 1, 127, -128), e < 0 && (e = 255 + e + 1), this[n] = e & 255, n + 1 }; m.prototype.writeInt16LE = function (e, n, r) { return e = +e, n = n >>> 0, r || _e(this, e, n, 2, 32767, -32768), this[n] = e & 255, this[n + 1] = e >>> 8, n + 2 }; m.prototype.writeInt16BE = function (e, n, r) { return e = +e, n = n >>> 0, r || _e(this, e, n, 2, 32767, -32768), this[n] = e >>> 8, this[n + 1] = e & 255, n + 2 }; m.prototype.writeInt32LE = function (e, n, r) { return e = +e, n = n >>> 0, r || _e(this, e, n, 4, 2147483647, -2147483648), this[n] = e & 255, this[n + 1] = e >>> 8, this[n + 2] = e >>> 16, this[n + 3] = e >>> 24, n + 4 }; m.prototype.writeInt32BE = function (e, n, r) { return e = +e, n = n >>> 0, r || _e(this, e, n, 4, 2147483647, -2147483648), e < 0 && (e = 4294967295 + e + 1), this[n] = e >>> 24, this[n + 1] = e >>> 16, this[n + 2] = e >>> 8, this[n + 3] = e & 255, n + 4 }; m.prototype.writeBigInt64LE = function (e, n = 0) { return Yr(this, e, n, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff")) }; m.prototype.writeBigInt64BE = function (e, n = 0) { return Xr(this, e, n, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff")) }; m.prototype.writeFloatLE = function (e, n, r) { return to(this, e, n, !0, r) }; m.prototype.writeFloatBE = function (e, n, r) { return to(this, e, n, !1, r) }; m.prototype.writeDoubleLE = function (e, n, r) { return no(this, e, n, !0, r) }; m.prototype.writeDoubleBE = function (e, n, r) { return no(this, e, n, !1, r) }; m.prototype.copy = function (e, n, r, o) { if (!m.isBuffer(e)) throw new TypeError("argument should be a Buffer"); if (r || (r = 0), !o && o !== 0 && (o = this.length), n >= e.length && (n = e.length), n || (n = 0), o > 0 && o < r && (o = r), o === r || e.length === 0 || this.length === 0) return 0; if (n < 0) throw new RangeError("targetStart out of bounds"); if (r < 0 || r >= this.length) throw new RangeError("Index out of range"); if (o < 0) throw new RangeError("sourceEnd out of bounds"); o > this.length && (o = this.length), e.length - n < o - r && (o = e.length - n + r); let i = o - r; return this === e ? this.copyWithin(n, r, o) : Uint8Array.prototype.set.call(e, this.subarray(r, o), n), i }; m.prototype.fill = function (e, n, r, o) { if (typeof e == "string") { if (typeof n == "string" ? (o = n, n = 0, r = this.length) : typeof r == "string" && (o = r, r = this.length), o !== void 0 && typeof o != "string") throw new TypeError("encoding must be a string"); if (typeof o == "string" && !m.isEncoding(o)) throw new TypeError("Unknown encoding: " + o); if (e.length === 1) { let s = e.charCodeAt(0); (o === "utf8" && s < 128 || o === "latin1") && (e = s) } } else typeof e == "number" ? e = e & 255 : typeof e == "boolean" && (e = Number(e)); if (n < 0 || this.length < n || this.length < r) throw new RangeError("Out of range index"); if (r <= n) return this; n = n >>> 0, r = r === void 0 ? this.length : r >>> 0, e || (e = 0); let i; if (typeof e == "number") for (i = n; i < r; ++i)this[i] = e; else { let s = m.isBuffer(e) ? e : m.from(e, o), l = s.length; if (l === 0) throw new TypeError('The value "' + e + '" is invalid for argument "value"'); for (i = 0; i < r - n; ++i)this[i + n] = s[i % l] } return this }; Ze = {}; ln("ERR_BUFFER_OUT_OF_BOUNDS", function (t) { return t ? `${t} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds" }, RangeError); ln("ERR_INVALID_ARG_TYPE", function (t, e) { return `The "${t}" argument must be of type number. Received type ${typeof e}` }, TypeError); ln("ERR_OUT_OF_RANGE", function (t, e, n) { let r = `The value of "${t}" is out of range.`, o = n; return Number.isInteger(n) && Math.abs(n) > 2 ** 32 ? o = Hr(String(n)) : typeof n == "bigint" && (o = String(n), (n > BigInt(2) ** BigInt(32) || n < -(BigInt(2) ** BigInt(32))) && (o = Hr(o)), o += "n"), r += ` It must be ${e}. Received ${o}`, r }, RangeError); gs = /[^+/0-9A-Za-z-_]/g; vs = function () { let t = "0123456789abcdef", e = new Array(256); for (let n = 0; n < 16; ++n) { let r = n * 16; for (let o = 0; o < 16; ++o)e[r + o] = t[n] + t[o] } return e }() }); var U = te(() => { }); function so(t) { let e = Ss === 4 ? 31 : 63, n = ptr(1).shl(e).not(); return t.and(n) } function un(t) { return new dn(t) } var cn, Ss, dn, ao = te(() => { U(); ({ pageSize: cn, pointerSize: Ss } = Process), dn = class { constructor(e) { this.sliceSize = e, this.slicesPerPage = cn / e, this.pages = [], this.free = [] } allocateSlice(e, n) { let r = e.near === void 0, o = n === 1; if (r && o) { let i = this.free.pop(); if (i !== void 0) return i } else if (n < cn) { let { free: i } = this, s = i.length, l = o ? null : ptr(n - 1); for (let a = 0; a !== s; a++) { let c = i[a], d = r || this._isSliceNear(c, e), p = o || c.and(l).isNull(); if (d && p) return i.splice(a, 1)[0] } } return this._allocatePage(e) } _allocatePage(e) { let n = Memory.alloc(cn, e), { sliceSize: r, slicesPerPage: o } = this; for (let i = 1; i !== o; i++) { let s = n.add(i * r); this.free.push(s) } return this.pages.push(n), n } _isSliceNear(e, n) { let r = e.add(this.sliceSize), { near: o, maxDistance: i } = n, s = so(o.sub(e)), l = so(o.sub(r)); return s.compare(i) <= 0 && l.compare(i) <= 0 } freeSlice(e) { this.free.push(e) } } }); function fe(t, e) { if (e !== 0) throw new Error(t + " failed: " + e) } var We = te(() => { U() }); function ke(t, e) { this.handle = t, this.vm = e, this.vtable = t.readPointer() } function at(t, e, n, r) { let o = null; return function () { o === null && (o = new NativeFunction(this.vtable.add((t - 1) * ws).readPointer(), e, n, Is)); let i = [o]; return i = i.concat.apply(i, arguments), r.apply(this, i) } } var Tt, At, ws, Is, pn = te(() => { U(); We(); Tt = { v1_0: 805371904, v1_2: 805372416 }, At = { canTagObjects: 1 }, { pointerSize: ws } = Process, Is = { exceptions: "propagate" }; ke.prototype.deallocate = at(47, "int32", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); ke.prototype.getLoadedClasses = at(78, "int32", ["pointer", "pointer", "pointer"], function (t, e, n) { let r = t(this.handle, e, n); fe("EnvJvmti::getLoadedClasses", r) }); ke.prototype.iterateOverInstancesOfClass = at(112, "int32", ["pointer", "pointer", "int", "pointer", "pointer"], function (t, e, n, r, o) { let i = t(this.handle, e, n, r, o); fe("EnvJvmti::iterateOverInstancesOfClass", i) }); ke.prototype.getObjectsWithTags = at(114, "int32", ["pointer", "int", "pointer", "pointer", "pointer", "pointer"], function (t, e, n, r, o, i) { let s = t(this.handle, e, n, r, o, i); fe("EnvJvmti::getObjectsWithTags", s) }); ke.prototype.addCapabilities = at(142, "int32", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }) }); function Me(t, e, { limit: n }) { let r = t, o = null; for (let i = 0; i !== n; i++) { let s = Instruction.parse(r), l = e(s, o); if (l !== null) return l; r = s.next, o = s } return null } var fn = te(() => { U() }); function ue(t) { let e = null, n = !1; return function (...r) { return n || (e = t(...r), n = !0), e } } var hn = te(() => { U() }); function y(t, e) { this.handle = t, this.vm = e } function Be(t) { return Tn.push(t), t } function Lt(t) { return _n === null && (_n = t.handle.readPointer()), _n } function L(t, e, n, r) { let o = null; return function () { o === null && (o = new NativeFunction(Lt(this).add(t * xt).readPointer(), e, n, co)); let i = [o]; return i = i.concat.apply(i, arguments), r.apply(this, i) } } function $a(t, e) { return function () { t.perform(n => { n.deleteGlobalRef(e) }) } } function Nt(t, e, n, r) { return xn(this, "p", Za, t, e, n, r) } function An(t, e, n, r) { return xn(this, "v", qa, t, e, n, r) } function Ha(t, e, n, r) { return xn(this, "n", Wa, t, e, n, r) } function xn(t, e, n, r, o, i, s) { if (s !== void 0) return n(t, r, o, i, s); let l = [r, e, o].concat(i).join("|"), a = lo.get(l); return a === void 0 && (a = n(t, r, o, i, co), lo.set(l, a)), a } function Za(t, e, n, r, o) { return new NativeFunction(Lt(t).add(e * xt).readPointer(), n, ["pointer", "pointer", "pointer"].concat(r), o) } function qa(t, e, n, r, o) { return new NativeFunction(Lt(t).add(e * xt).readPointer(), n, ["pointer", "pointer", "pointer", "..."].concat(r), o) } function Wa(t, e, n, r, o) { return new NativeFunction(Lt(t).add(e * xt).readPointer(), n, ["pointer", "pointer", "pointer", "pointer", "..."].concat(r), o) } var xt, Re, Cs, Ts, As, xs, Ls, Ns, ks, Ms, js, Os, Rs, Ps, Fs, Ds, Us, Bs, zs, Vs, Js, Gs, $s, Hs, Zs, qs, Ws, Ks, Qs, Ys, Xs, ea, ta, na, ra, oa, ia, sa, aa, la, ca, da, ua, pa, fa, ha, _a, ma, ga, ba, ya, Ea, va, Sa, wa, Ia, Ca, Ta, Aa, xa, La, Na, ka, Ma, ja, Oa, Ra, Pa, Fa, Da, Ua, Ba, za, Va, Ja, Ga, co, _n, Tn, lo, mn, gn, bn, yn, En, vn, Sn, wn, In, Cn, lt = te(() => { U(); xt = Process.pointerSize, Re = 2, Cs = 28, Ts = 34, As = 37, xs = 40, Ls = 43, Ns = 46, ks = 49, Ms = 52, js = 55, Os = 58, Rs = 61, Ps = 64, Fs = 67, Ds = 70, Us = 73, Bs = 76, zs = 79, Vs = 82, Js = 85, Gs = 88, $s = 91, Hs = 114, Zs = 117, qs = 120, Ws = 123, Ks = 126, Qs = 129, Ys = 132, Xs = 135, ea = 138, ta = 141, na = 95, ra = 96, oa = 97, ia = 98, sa = 99, aa = 100, la = 101, ca = 102, da = 103, ua = 104, pa = 105, fa = 106, ha = 107, _a = 108, ma = 109, ga = 110, ba = 111, ya = 112, Ea = 145, va = 146, Sa = 147, wa = 148, Ia = 149, Ca = 150, Ta = 151, Aa = 152, xa = 153, La = 154, Na = 155, ka = 156, Ma = 157, ja = 158, Oa = 159, Ra = 160, Pa = 161, Fa = 162, Da = { pointer: Ts, uint8: As, int8: xs, uint16: Ls, int16: Ns, int32: ks, int64: Ms, float: js, double: Os, void: Rs }, Ua = { pointer: Ps, uint8: Fs, int8: Ds, uint16: Us, int16: Bs, int32: zs, int64: Vs, float: Js, double: Gs, void: $s }, Ba = { pointer: Hs, uint8: Zs, int8: qs, uint16: Ws, int16: Ks, int32: Qs, int64: Ys, float: Xs, double: ea, void: ta }, za = { pointer: na, uint8: ra, int8: oa, uint16: ia, int16: sa, int32: aa, int64: la, float: ca, double: da }, Va = { pointer: ua, uint8: pa, int8: fa, uint16: ha, int16: _a, int32: ma, int64: ga, float: ba, double: ya }, Ja = { pointer: Ea, uint8: va, int8: Sa, uint16: wa, int16: Ia, int32: Ca, int64: Ta, float: Aa, double: xa }, Ga = { pointer: La, uint8: Na, int8: ka, uint16: Ma, int16: ja, int32: Oa, int64: Ra, float: Pa, double: Fa }, co = { exceptions: "propagate" }, _n = null, Tn = []; y.dispose = function (t) { Tn.forEach(t.deleteGlobalRef, t), Tn = [] }; y.prototype.getVersion = L(4, "int32", ["pointer"], function (t) { return t(this.handle) }); y.prototype.findClass = L(6, "pointer", ["pointer", "pointer"], function (t, e) { let n = t(this.handle, Memory.allocUtf8String(e)); return this.throwIfExceptionPending(), n }); y.prototype.throwIfExceptionPending = function () { let t = this.exceptionOccurred(); if (t.isNull()) return; this.exceptionClear(); let e = this.newGlobalRef(t); this.deleteLocalRef(t); let n = this.vaMethod("pointer", [])(this.handle, e, this.javaLangObject().toString), r = this.stringFromJni(n); this.deleteLocalRef(n); let o = new Error(r); throw o.$h = e, Script.bindWeak(o, $a(this.vm, e)), o }; y.prototype.fromReflectedMethod = L(7, "pointer", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.fromReflectedField = L(8, "pointer", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.toReflectedMethod = L(9, "pointer", ["pointer", "pointer", "pointer", "uint8"], function (t, e, n, r) { return t(this.handle, e, n, r) }); y.prototype.getSuperclass = L(10, "pointer", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.isAssignableFrom = L(11, "uint8", ["pointer", "pointer", "pointer"], function (t, e, n) { return !!t(this.handle, e, n) }); y.prototype.toReflectedField = L(12, "pointer", ["pointer", "pointer", "pointer", "uint8"], function (t, e, n, r) { return t(this.handle, e, n, r) }); y.prototype.throw = L(13, "int32", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.exceptionOccurred = L(15, "pointer", ["pointer"], function (t) { return t(this.handle) }); y.prototype.exceptionDescribe = L(16, "void", ["pointer"], function (t) { t(this.handle) }); y.prototype.exceptionClear = L(17, "void", ["pointer"], function (t) { t(this.handle) }); y.prototype.pushLocalFrame = L(19, "int32", ["pointer", "int32"], function (t, e) { return t(this.handle, e) }); y.prototype.popLocalFrame = L(20, "pointer", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.newGlobalRef = L(21, "pointer", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.deleteGlobalRef = L(22, "void", ["pointer", "pointer"], function (t, e) { t(this.handle, e) }); y.prototype.deleteLocalRef = L(23, "void", ["pointer", "pointer"], function (t, e) { t(this.handle, e) }); y.prototype.isSameObject = L(24, "uint8", ["pointer", "pointer", "pointer"], function (t, e, n) { return !!t(this.handle, e, n) }); y.prototype.newLocalRef = L(25, "pointer", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.allocObject = L(27, "pointer", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.getObjectClass = L(31, "pointer", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.isInstanceOf = L(32, "uint8", ["pointer", "pointer", "pointer"], function (t, e, n) { return !!t(this.handle, e, n) }); y.prototype.getMethodId = L(33, "pointer", ["pointer", "pointer", "pointer", "pointer"], function (t, e, n, r) { return t(this.handle, e, Memory.allocUtf8String(n), Memory.allocUtf8String(r)) }); y.prototype.getFieldId = L(94, "pointer", ["pointer", "pointer", "pointer", "pointer"], function (t, e, n, r) { return t(this.handle, e, Memory.allocUtf8String(n), Memory.allocUtf8String(r)) }); y.prototype.getIntField = L(100, "int32", ["pointer", "pointer", "pointer"], function (t, e, n) { return t(this.handle, e, n) }); y.prototype.getStaticMethodId = L(113, "pointer", ["pointer", "pointer", "pointer", "pointer"], function (t, e, n, r) { return t(this.handle, e, Memory.allocUtf8String(n), Memory.allocUtf8String(r)) }); y.prototype.getStaticFieldId = L(144, "pointer", ["pointer", "pointer", "pointer", "pointer"], function (t, e, n, r) { return t(this.handle, e, Memory.allocUtf8String(n), Memory.allocUtf8String(r)) }); y.prototype.getStaticIntField = L(150, "int32", ["pointer", "pointer", "pointer"], function (t, e, n) { return t(this.handle, e, n) }); y.prototype.getStringLength = L(164, "int32", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.getStringChars = L(165, "pointer", ["pointer", "pointer", "pointer"], function (t, e) { return t(this.handle, e, NULL) }); y.prototype.releaseStringChars = L(166, "void", ["pointer", "pointer", "pointer"], function (t, e, n) { t(this.handle, e, n) }); y.prototype.newStringUtf = L(167, "pointer", ["pointer", "pointer"], function (t, e) { let n = Memory.allocUtf8String(e); return t(this.handle, n) }); y.prototype.getStringUtfChars = L(169, "pointer", ["pointer", "pointer", "pointer"], function (t, e) { return t(this.handle, e, NULL) }); y.prototype.releaseStringUtfChars = L(170, "void", ["pointer", "pointer", "pointer"], function (t, e, n) { t(this.handle, e, n) }); y.prototype.getArrayLength = L(171, "int32", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.newObjectArray = L(172, "pointer", ["pointer", "int32", "pointer", "pointer"], function (t, e, n, r) { return t(this.handle, e, n, r) }); y.prototype.getObjectArrayElement = L(173, "pointer", ["pointer", "pointer", "int32"], function (t, e, n) { return t(this.handle, e, n) }); y.prototype.setObjectArrayElement = L(174, "void", ["pointer", "pointer", "int32", "pointer"], function (t, e, n, r) { t(this.handle, e, n, r) }); y.prototype.newBooleanArray = L(175, "pointer", ["pointer", "int32"], function (t, e) { return t(this.handle, e) }); y.prototype.newByteArray = L(176, "pointer", ["pointer", "int32"], function (t, e) { return t(this.handle, e) }); y.prototype.newCharArray = L(177, "pointer", ["pointer", "int32"], function (t, e) { return t(this.handle, e) }); y.prototype.newShortArray = L(178, "pointer", ["pointer", "int32"], function (t, e) { return t(this.handle, e) }); y.prototype.newIntArray = L(179, "pointer", ["pointer", "int32"], function (t, e) { return t(this.handle, e) }); y.prototype.newLongArray = L(180, "pointer", ["pointer", "int32"], function (t, e) { return t(this.handle, e) }); y.prototype.newFloatArray = L(181, "pointer", ["pointer", "int32"], function (t, e) { return t(this.handle, e) }); y.prototype.newDoubleArray = L(182, "pointer", ["pointer", "int32"], function (t, e) { return t(this.handle, e) }); y.prototype.getBooleanArrayElements = L(183, "pointer", ["pointer", "pointer", "pointer"], function (t, e) { return t(this.handle, e, NULL) }); y.prototype.getByteArrayElements = L(184, "pointer", ["pointer", "pointer", "pointer"], function (t, e) { return t(this.handle, e, NULL) }); y.prototype.getCharArrayElements = L(185, "pointer", ["pointer", "pointer", "pointer"], function (t, e) { return t(this.handle, e, NULL) }); y.prototype.getShortArrayElements = L(186, "pointer", ["pointer", "pointer", "pointer"], function (t, e) { return t(this.handle, e, NULL) }); y.prototype.getIntArrayElements = L(187, "pointer", ["pointer", "pointer", "pointer"], function (t, e) { return t(this.handle, e, NULL) }); y.prototype.getLongArrayElements = L(188, "pointer", ["pointer", "pointer", "pointer"], function (t, e) { return t(this.handle, e, NULL) }); y.prototype.getFloatArrayElements = L(189, "pointer", ["pointer", "pointer", "pointer"], function (t, e) { return t(this.handle, e, NULL) }); y.prototype.getDoubleArrayElements = L(190, "pointer", ["pointer", "pointer", "pointer"], function (t, e) { return t(this.handle, e, NULL) }); y.prototype.releaseBooleanArrayElements = L(191, "pointer", ["pointer", "pointer", "pointer", "int32"], function (t, e, n) { t(this.handle, e, n, Re) }); y.prototype.releaseByteArrayElements = L(192, "pointer", ["pointer", "pointer", "pointer", "int32"], function (t, e, n) { t(this.handle, e, n, Re) }); y.prototype.releaseCharArrayElements = L(193, "pointer", ["pointer", "pointer", "pointer", "int32"], function (t, e, n) { t(this.handle, e, n, Re) }); y.prototype.releaseShortArrayElements = L(194, "pointer", ["pointer", "pointer", "pointer", "int32"], function (t, e, n) { t(this.handle, e, n, Re) }); y.prototype.releaseIntArrayElements = L(195, "pointer", ["pointer", "pointer", "pointer", "int32"], function (t, e, n) { t(this.handle, e, n, Re) }); y.prototype.releaseLongArrayElements = L(196, "pointer", ["pointer", "pointer", "pointer", "int32"], function (t, e, n) { t(this.handle, e, n, Re) }); y.prototype.releaseFloatArrayElements = L(197, "pointer", ["pointer", "pointer", "pointer", "int32"], function (t, e, n) { t(this.handle, e, n, Re) }); y.prototype.releaseDoubleArrayElements = L(198, "pointer", ["pointer", "pointer", "pointer", "int32"], function (t, e, n) { t(this.handle, e, n, Re) }); y.prototype.getByteArrayRegion = L(200, "void", ["pointer", "pointer", "int", "int", "pointer"], function (t, e, n, r, o) { t(this.handle, e, n, r, o) }); y.prototype.setBooleanArrayRegion = L(207, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function (t, e, n, r, o) { t(this.handle, e, n, r, o) }); y.prototype.setByteArrayRegion = L(208, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function (t, e, n, r, o) { t(this.handle, e, n, r, o) }); y.prototype.setCharArrayRegion = L(209, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function (t, e, n, r, o) { t(this.handle, e, n, r, o) }); y.prototype.setShortArrayRegion = L(210, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function (t, e, n, r, o) { t(this.handle, e, n, r, o) }); y.prototype.setIntArrayRegion = L(211, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function (t, e, n, r, o) { t(this.handle, e, n, r, o) }); y.prototype.setLongArrayRegion = L(212, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function (t, e, n, r, o) { t(this.handle, e, n, r, o) }); y.prototype.setFloatArrayRegion = L(213, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function (t, e, n, r, o) { t(this.handle, e, n, r, o) }); y.prototype.setDoubleArrayRegion = L(214, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function (t, e, n, r, o) { t(this.handle, e, n, r, o) }); y.prototype.registerNatives = L(215, "int32", ["pointer", "pointer", "pointer", "int32"], function (t, e, n, r) { return t(this.handle, e, n, r) }); y.prototype.monitorEnter = L(217, "int32", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.monitorExit = L(218, "int32", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.getDirectBufferAddress = L(230, "pointer", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); y.prototype.getObjectRefType = L(232, "int32", ["pointer", "pointer"], function (t, e) { return t(this.handle, e) }); lo = new Map; y.prototype.constructor = function (t, e) { return An.call(this, Cs, "pointer", t, e) }; y.prototype.vaMethod = function (t, e, n) { let r = Da[t]; if (r === void 0) throw new Error("Unsupported type: " + t); return An.call(this, r, t, e, n) }; y.prototype.nonvirtualVaMethod = function (t, e, n) { let r = Ua[t]; if (r === void 0) throw new Error("Unsupported type: " + t); return Ha.call(this, r, t, e, n) }; y.prototype.staticVaMethod = function (t, e, n) { let r = Ba[t]; if (r === void 0) throw new Error("Unsupported type: " + t); return An.call(this, r, t, e, n) }; y.prototype.getField = function (t) { let e = za[t]; if (e === void 0) throw new Error("Unsupported type: " + t); return Nt.call(this, e, t, []) }; y.prototype.getStaticField = function (t) { let e = Ja[t]; if (e === void 0) throw new Error("Unsupported type: " + t); return Nt.call(this, e, t, []) }; y.prototype.setField = function (t) { let e = Va[t]; if (e === void 0) throw new Error("Unsupported type: " + t); return Nt.call(this, e, "void", [t]) }; y.prototype.setStaticField = function (t) { let e = Ga[t]; if (e === void 0) throw new Error("Unsupported type: " + t); return Nt.call(this, e, "void", [t]) }; mn = null; y.prototype.javaLangClass = function () { if (mn === null) { let t = this.findClass("java/lang/Class"); try { let e = this.getMethodId.bind(this, t); mn = { handle: Be(this.newGlobalRef(t)), getName: e("getName", "()Ljava/lang/String;"), getSimpleName: e("getSimpleName", "()Ljava/lang/String;"), getGenericSuperclass: e("getGenericSuperclass", "()Ljava/lang/reflect/Type;"), getDeclaredConstructors: e("getDeclaredConstructors", "()[Ljava/lang/reflect/Constructor;"), getDeclaredMethods: e("getDeclaredMethods", "()[Ljava/lang/reflect/Method;"), getDeclaredFields: e("getDeclaredFields", "()[Ljava/lang/reflect/Field;"), isArray: e("isArray", "()Z"), isPrimitive: e("isPrimitive", "()Z"), isInterface: e("isInterface", "()Z"), getComponentType: e("getComponentType", "()Ljava/lang/Class;") } } finally { this.deleteLocalRef(t) } } return mn }; gn = null; y.prototype.javaLangObject = function () { if (gn === null) { let t = this.findClass("java/lang/Object"); try { let e = this.getMethodId.bind(this, t); gn = { handle: Be(this.newGlobalRef(t)), toString: e("toString", "()Ljava/lang/String;"), getClass: e("getClass", "()Ljava/lang/Class;") } } finally { this.deleteLocalRef(t) } } return gn }; bn = null; y.prototype.javaLangReflectConstructor = function () { if (bn === null) { let t = this.findClass("java/lang/reflect/Constructor"); try { bn = { getGenericParameterTypes: this.getMethodId(t, "getGenericParameterTypes", "()[Ljava/lang/reflect/Type;") } } finally { this.deleteLocalRef(t) } } return bn }; yn = null; y.prototype.javaLangReflectMethod = function () { if (yn === null) { let t = this.findClass("java/lang/reflect/Method"); try { let e = this.getMethodId.bind(this, t); yn = { getName: e("getName", "()Ljava/lang/String;"), getGenericParameterTypes: e("getGenericParameterTypes", "()[Ljava/lang/reflect/Type;"), getParameterTypes: e("getParameterTypes", "()[Ljava/lang/Class;"), getGenericReturnType: e("getGenericReturnType", "()Ljava/lang/reflect/Type;"), getGenericExceptionTypes: e("getGenericExceptionTypes", "()[Ljava/lang/reflect/Type;"), getModifiers: e("getModifiers", "()I"), isVarArgs: e("isVarArgs", "()Z") } } finally { this.deleteLocalRef(t) } } return yn }; En = null; y.prototype.javaLangReflectField = function () { if (En === null) { let t = this.findClass("java/lang/reflect/Field"); try { let e = this.getMethodId.bind(this, t); En = { getName: e("getName", "()Ljava/lang/String;"), getType: e("getType", "()Ljava/lang/Class;"), getGenericType: e("getGenericType", "()Ljava/lang/reflect/Type;"), getModifiers: e("getModifiers", "()I"), toString: e("toString", "()Ljava/lang/String;") } } finally { this.deleteLocalRef(t) } } return En }; vn = null; y.prototype.javaLangReflectTypeVariable = function () { if (vn === null) { let t = this.findClass("java/lang/reflect/TypeVariable"); try { let e = this.getMethodId.bind(this, t); vn = { handle: Be(this.newGlobalRef(t)), getName: e("getName", "()Ljava/lang/String;"), getBounds: e("getBounds", "()[Ljava/lang/reflect/Type;"), getGenericDeclaration: e("getGenericDeclaration", "()Ljava/lang/reflect/GenericDeclaration;") } } finally { this.deleteLocalRef(t) } } return vn }; Sn = null; y.prototype.javaLangReflectWildcardType = function () { if (Sn === null) { let t = this.findClass("java/lang/reflect/WildcardType"); try { let e = this.getMethodId.bind(this, t); Sn = { handle: Be(this.newGlobalRef(t)), getLowerBounds: e("getLowerBounds", "()[Ljava/lang/reflect/Type;"), getUpperBounds: e("getUpperBounds", "()[Ljava/lang/reflect/Type;") } } finally { this.deleteLocalRef(t) } } return Sn }; wn = null; y.prototype.javaLangReflectGenericArrayType = function () { if (wn === null) { let t = this.findClass("java/lang/reflect/GenericArrayType"); try { wn = { handle: Be(this.newGlobalRef(t)), getGenericComponentType: this.getMethodId(t, "getGenericComponentType", "()Ljava/lang/reflect/Type;") } } finally { this.deleteLocalRef(t) } } return wn }; In = null; y.prototype.javaLangReflectParameterizedType = function () { if (In === null) { let t = this.findClass("java/lang/reflect/ParameterizedType"); try { let e = this.getMethodId.bind(this, t); In = { handle: Be(this.newGlobalRef(t)), getActualTypeArguments: e("getActualTypeArguments", "()[Ljava/lang/reflect/Type;"), getRawType: e("getRawType", "()Ljava/lang/reflect/Type;"), getOwnerType: e("getOwnerType", "()Ljava/lang/reflect/Type;") } } finally { this.deleteLocalRef(t) } } return In }; Cn = null; y.prototype.javaLangString = function () { if (Cn === null) { let t = this.findClass("java/lang/String"); try { Cn = { handle: Be(this.newGlobalRef(t)) } } finally { this.deleteLocalRef(t) } } return Cn }; y.prototype.getClassName = function (t) { let e = this.vaMethod("pointer", [])(this.handle, t, this.javaLangClass().getName); try { return this.stringFromJni(e) } finally { this.deleteLocalRef(e) } }; y.prototype.getObjectClassName = function (t) { let e = this.getObjectClass(t); try { return this.getClassName(e) } finally { this.deleteLocalRef(e) } }; y.prototype.getActualTypeArgument = function (t) { let e = this.vaMethod("pointer", [])(this.handle, t, this.javaLangReflectParameterizedType().getActualTypeArguments); if (this.throwIfExceptionPending(), !e.isNull()) try { return this.getTypeNameFromFirstTypeElement(e) } finally { this.deleteLocalRef(e) } }; y.prototype.getTypeNameFromFirstTypeElement = function (t) { if (this.getArrayLength(t) > 0) { let n = this.getObjectArrayElement(t, 0); try { return this.getTypeName(n) } finally { this.deleteLocalRef(n) } } else return "java.lang.Object" }; y.prototype.getTypeName = function (t, e) { let n = this.vaMethod("pointer", []); if (this.isInstanceOf(t, this.javaLangClass().handle)) return this.getClassName(t); if (this.isInstanceOf(t, this.javaLangReflectGenericArrayType().handle)) return this.getArrayTypeName(t); if (this.isInstanceOf(t, this.javaLangReflectParameterizedType().handle)) { let r = n(this.handle, t, this.javaLangReflectParameterizedType().getRawType); this.throwIfExceptionPending(); let o; try { o = this.getTypeName(r) } finally { this.deleteLocalRef(r) } return e && (o += "<" + this.getActualTypeArgument(t) + ">"), o } else return this.isInstanceOf(t, this.javaLangReflectTypeVariable().handle) || this.isInstanceOf(t, this.javaLangReflectWildcardType().handle), "java.lang.Object" }; y.prototype.getArrayTypeName = function (t) { let e = this.vaMethod("pointer", []); if (this.isInstanceOf(t, this.javaLangClass().handle)) return this.getClassName(t); if (this.isInstanceOf(t, this.javaLangReflectGenericArrayType().handle)) { let n = e(this.handle, t, this.javaLangReflectGenericArrayType().getGenericComponentType); this.throwIfExceptionPending(); try { return "[L" + this.getTypeName(n) + ";" } finally { this.deleteLocalRef(n) } } else return "[Ljava.lang.Object;" }; y.prototype.stringFromJni = function (t) { let e = this.getStringChars(t); if (e.isNull()) throw new Error("Unable to access string"); try { let n = this.getStringLength(t); return e.readUtf16String(n) } finally { this.releaseStringChars(t, e) } } }); function Ae(t) { let e = t.vm, n = null, r = null, o = null; function i() { let l = e.readPointer(), a = { exceptions: "propagate" }; n = new NativeFunction(l.add(4 * Ke).readPointer(), "int32", ["pointer", "pointer", "pointer"], a), r = new NativeFunction(l.add(5 * Ke).readPointer(), "int32", ["pointer"], a), o = new NativeFunction(l.add(6 * Ke).readPointer(), "int32", ["pointer", "pointer", "int32"], a) } this.handle = e, this.perform = function (l) { let a = Process.getCurrentThreadId(), c = s(a); if (c !== null) return l(c); let d = this._tryGetEnv(), p = d !== null; p || (d = this.attachCurrentThread(), ze.set(a, !0)), this.link(a, d); try { return l(d) } finally { let f = a === Ln; if (f || this.unlink(a), !p && !f) { let u = ze.get(a); ze.delete(a), u && this.detachCurrentThread() } } }, this.attachCurrentThread = function () { let l = Memory.alloc(Ke); return fe("VM::AttachCurrentThread", n(e, l, NULL)), new y(l.readPointer(), this) }, this.detachCurrentThread = function () { fe("VM::DetachCurrentThread", r(e)) }, this.preventDetachDueToClassLoader = function () { let l = Process.getCurrentThreadId(); ze.has(l) && ze.set(l, !1) }, this.getEnv = function () { let l = s(Process.getCurrentThreadId()); if (l !== null) return l; let a = Memory.alloc(Ke), c = o(e, a, uo); if (c === -2) throw new Error("Current thread is not attached to the Java VM; please move this code inside a Java.perform() callback"); return fe("VM::GetEnv", c), new y(a.readPointer(), this) }, this.tryGetEnv = function () { let l = s(Process.getCurrentThreadId()); return l !== null ? l : this._tryGetEnv() }, this._tryGetEnv = function () { let l = this.tryGetEnvHandle(uo); return l === null ? null : new y(l, this) }, this.tryGetEnvHandle = function (l) { let a = Memory.alloc(Ke); return o(e, a, l) !== 0 ? null : a.readPointer() }, this.makeHandleDestructor = function (l) { return () => { this.perform(a => { a.deleteGlobalRef(l) }) } }, this.link = function (l, a) { let c = ct.get(l); c === void 0 ? ct.set(l, [a, 1]) : c[1]++ }, this.unlink = function (l) { let a = ct.get(l); a[1] === 1 ? ct.delete(l) : a[1]-- }; function s(l) { let a = ct.get(l); return a === void 0 ? null : a[0] } i.call(this) } var uo, Ke, Ln, ze, ct, kt = te(() => { U(); lt(); We(); uo = 65542, Ke = Process.pointerSize, Ln = Process.getCurrentThreadId(), ze = new Map, ct = new Map; Ae.dispose = function (t) { ze.get(Ln) === !0 && (ze.delete(Ln), t.detachCurrentThread()) } }); var $t = {}; Br($t, { ArtMethod: () => Ft, ArtStackVisitor: () => Gn, DVM_JNI_ENV_OFFSET_SELF: () => Lo, HandleVector: () => ht, VariableSizedHandleScope: () => _t, backtrace: () => ir, deoptimizeBootImage: () => dr, deoptimizeEverything: () => cr, deoptimizeMethod: () => lr, ensureClassInitialized: () => Gl, getAndroidApiLevel: () => ne, getAndroidVersion: () => mt, getApi: () => G, getArtApexVersion: () => Yn, getArtClassSpec: () => er, getArtFieldSpec: () => Jt, getArtMethodSpec: () => be, getArtThreadFromEnv: () => Gt, getArtThreadSpec: () => Ye, makeArtClassLoaderVisitor: () => or, makeArtClassVisitor: () => rr, makeMethodMangler: () => Fc, makeObjectVisitorPredicate: () => pr, revertGlobalPatches: () => sr, translateMethod: () => Dc, withAllArtThreadsSuspended: () => nr, withRunnableArtThread: () => Se }); function G() { return Mn === null && (Mn = Vl()), Mn } function Vl() { let t = Process.enumerateModules().filter(u => /^lib(art|dvm).so$/.test(u.name)).filter(u => !/\/system\/fake-libs/.test(u.path)); if (t.length === 0) return null; let e = t[0], n = e.name.indexOf("art") !== -1 ? "art" : "dalvik", r = n === "art", o = { module: e, find(u) { let { module: _ } = this, h = _.findExportByName(u); return h === null && (h = _.findSymbolByName(u)), h }, flavor: n, addLocalReference: null }; o.isApiLevel34OrApexEquivalent = r && (o.find("_ZN3art7AppInfo29GetPrimaryApkReferenceProfileEv") !== null || o.find("_ZN3art6Thread15RunFlipFunctionEPS0_") !== null); let i = r ? { functions: { JNI_GetCreatedJavaVMs: ["JNI_GetCreatedJavaVMs", "int", ["pointer", "int", "pointer"]], artInterpreterToCompiledCodeBridge: function (u) { this.artInterpreterToCompiledCodeBridge = u }, _ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadENS_6ObjPtrINS_6mirror6ObjectEEE: ["art::JavaVMExt::AddGlobalRef", "pointer", ["pointer", "pointer", "pointer"]], _ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadEPNS_6mirror6ObjectE: ["art::JavaVMExt::AddGlobalRef", "pointer", ["pointer", "pointer", "pointer"]], _ZN3art17ReaderWriterMutex13ExclusiveLockEPNS_6ThreadE: ["art::ReaderWriterMutex::ExclusiveLock", "void", ["pointer", "pointer"]], _ZN3art17ReaderWriterMutex15ExclusiveUnlockEPNS_6ThreadE: ["art::ReaderWriterMutex::ExclusiveUnlock", "void", ["pointer", "pointer"]], _ZN3art22IndirectReferenceTable3AddEjPNS_6mirror6ObjectE: function (u) { this["art::IndirectReferenceTable::Add"] = new NativeFunction(u, "pointer", ["pointer", "uint", "pointer"], K) }, _ZN3art22IndirectReferenceTable3AddENS_15IRTSegmentStateENS_6ObjPtrINS_6mirror6ObjectEEE: function (u) { this["art::IndirectReferenceTable::Add"] = new NativeFunction(u, "pointer", ["pointer", "uint", "pointer"], K) }, _ZN3art9JavaVMExt12DecodeGlobalEPv: function (u) { let _; ne() >= 26 ? _ = Bl(u, ["pointer", "pointer"]) : _ = new NativeFunction(u, "pointer", ["pointer", "pointer"], K), this["art::JavaVMExt::DecodeGlobal"] = function (h, g, b) { return _(h, b) } }, _ZN3art9JavaVMExt12DecodeGlobalEPNS_6ThreadEPv: ["art::JavaVMExt::DecodeGlobal", "pointer", ["pointer", "pointer", "pointer"]], _ZNK3art6Thread19DecodeGlobalJObjectEP8_jobject: ["art::Thread::DecodeJObject", "pointer", ["pointer", "pointer"]], _ZNK3art6Thread13DecodeJObjectEP8_jobject: ["art::Thread::DecodeJObject", "pointer", ["pointer", "pointer"]], _ZN3art10ThreadList10SuspendAllEPKcb: ["art::ThreadList::SuspendAll", "void", ["pointer", "pointer", "bool"]], _ZN3art10ThreadList10SuspendAllEv: function (u) { let _ = new NativeFunction(u, "void", ["pointer"], K); this["art::ThreadList::SuspendAll"] = function (h, g, b) { return _(h) } }, _ZN3art10ThreadList9ResumeAllEv: ["art::ThreadList::ResumeAll", "void", ["pointer"]], _ZN3art11ClassLinker12VisitClassesEPNS_12ClassVisitorE: ["art::ClassLinker::VisitClasses", "void", ["pointer", "pointer"]], _ZN3art11ClassLinker12VisitClassesEPFbPNS_6mirror5ClassEPvES4_: function (u) { let _ = new NativeFunction(u, "void", ["pointer", "pointer", "pointer"], K); this["art::ClassLinker::VisitClasses"] = function (h, g) { _(h, g, NULL) } }, _ZNK3art11ClassLinker17VisitClassLoadersEPNS_18ClassLoaderVisitorE: ["art::ClassLinker::VisitClassLoaders", "void", ["pointer", "pointer"]], _ZN3art2gc4Heap12VisitObjectsEPFvPNS_6mirror6ObjectEPvES5_: ["art::gc::Heap::VisitObjects", "void", ["pointer", "pointer", "pointer"]], _ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE: ["art::gc::Heap::GetInstances", "void", ["pointer", "pointer", "pointer", "int", "pointer"]], _ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEbiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE: function (u) { let _ = new NativeFunction(u, "void", ["pointer", "pointer", "pointer", "bool", "int", "pointer"], K); this["art::gc::Heap::GetInstances"] = function (h, g, b, E, C) { _(h, g, b, 0, E, C) } }, _ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEjb: ["art::StackVisitor::StackVisitor", "void", ["pointer", "pointer", "pointer", "uint", "uint", "bool"]], _ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEmb: ["art::StackVisitor::StackVisitor", "void", ["pointer", "pointer", "pointer", "uint", "size_t", "bool"]], _ZN3art12StackVisitor9WalkStackILNS0_16CountTransitionsE0EEEvb: ["art::StackVisitor::WalkStack", "void", ["pointer", "bool"]], _ZNK3art12StackVisitor9GetMethodEv: ["art::StackVisitor::GetMethod", "pointer", ["pointer"]], _ZNK3art12StackVisitor16DescribeLocationEv: function (u) { this["art::StackVisitor::DescribeLocation"] = Ot(u, ["pointer"]) }, _ZNK3art12StackVisitor24GetCurrentQuickFrameInfoEv: function (u) { this["art::StackVisitor::GetCurrentQuickFrameInfo"] = vc(u) }, _ZN3art7Context6CreateEv: ["art::Context::Create", "pointer", []], _ZN3art6Thread18GetLongJumpContextEv: ["art::Thread::GetLongJumpContext", "pointer", ["pointer"]], _ZN3art6mirror5Class13GetDescriptorEPNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE: function (u) { this["art::mirror::Class::GetDescriptor"] = u }, _ZN3art6mirror5Class11GetLocationEv: function (u) { this["art::mirror::Class::GetLocation"] = Ot(u, ["pointer"]) }, _ZN3art9ArtMethod12PrettyMethodEb: function (u) { this["art::ArtMethod::PrettyMethod"] = Ot(u, ["pointer", "bool"]) }, _ZN3art12PrettyMethodEPNS_9ArtMethodEb: function (u) { this["art::ArtMethod::PrettyMethodNullSafe"] = Ot(u, ["pointer", "bool"]) }, _ZN3art6Thread14CurrentFromGdbEv: ["art::Thread::CurrentFromGdb", "pointer", []], _ZN3art6mirror6Object5CloneEPNS_6ThreadE: function (u) { this["art::mirror::Object::Clone"] = new NativeFunction(u, "pointer", ["pointer", "pointer"], K) }, _ZN3art6mirror6Object5CloneEPNS_6ThreadEm: function (u) { let _ = new NativeFunction(u, "pointer", ["pointer", "pointer", "pointer"], K); this["art::mirror::Object::Clone"] = function (h, g) { let b = NULL; return _(h, g, b) } }, _ZN3art6mirror6Object5CloneEPNS_6ThreadEj: function (u) { let _ = new NativeFunction(u, "pointer", ["pointer", "pointer", "uint"], K); this["art::mirror::Object::Clone"] = function (h, g) { return _(h, g, 0) } }, _ZN3art3Dbg14SetJdwpAllowedEb: ["art::Dbg::SetJdwpAllowed", "void", ["bool"]], _ZN3art3Dbg13ConfigureJdwpERKNS_4JDWP11JdwpOptionsE: ["art::Dbg::ConfigureJdwp", "void", ["pointer"]], _ZN3art31InternalDebuggerControlCallback13StartDebuggerEv: ["art::InternalDebuggerControlCallback::StartDebugger", "void", ["pointer"]], _ZN3art3Dbg9StartJdwpEv: ["art::Dbg::StartJdwp", "void", []], _ZN3art3Dbg8GoActiveEv: ["art::Dbg::GoActive", "void", []], _ZN3art3Dbg21RequestDeoptimizationERKNS_21DeoptimizationRequestE: ["art::Dbg::RequestDeoptimization", "void", ["pointer"]], _ZN3art3Dbg20ManageDeoptimizationEv: ["art::Dbg::ManageDeoptimization", "void", []], _ZN3art15instrumentation15Instrumentation20EnableDeoptimizationEv: ["art::Instrumentation::EnableDeoptimization", "void", ["pointer"]], _ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEPKc: ["art::Instrumentation::DeoptimizeEverything", "void", ["pointer", "pointer"]], _ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEv: function (u) { let _ = new NativeFunction(u, "void", ["pointer"], K); this["art::Instrumentation::DeoptimizeEverything"] = function (h, g) { _(h) } }, _ZN3art7Runtime19DeoptimizeBootImageEv: ["art::Runtime::DeoptimizeBootImage", "void", ["pointer"]], _ZN3art15instrumentation15Instrumentation10DeoptimizeEPNS_9ArtMethodE: ["art::Instrumentation::Deoptimize", "void", ["pointer", "pointer"]], _ZN3art3jni12JniIdManager14DecodeMethodIdEP10_jmethodID: ["art::jni::JniIdManager::DecodeMethodId", "pointer", ["pointer", "pointer"]], _ZN3art3jni12JniIdManager13DecodeFieldIdEP9_jfieldID: ["art::jni::JniIdManager::DecodeFieldId", "pointer", ["pointer", "pointer"]], _ZN3art11interpreter18GetNterpEntryPointEv: ["art::interpreter::GetNterpEntryPoint", "pointer", []], _ZN3art7Monitor17TranslateLocationEPNS_9ArtMethodEjPPKcPi: ["art::Monitor::TranslateLocation", "void", ["pointer", "uint32", "pointer", "pointer"]] }, variables: { _ZN3art3Dbg9gRegistryE: function (u) { this.isJdwpStarted = () => !u.readPointer().isNull() }, _ZN3art3Dbg15gDebuggerActiveE: function (u) { this.isDebuggerActive = () => !!u.readU8() } }, optionals: new Set(["artInterpreterToCompiledCodeBridge", "_ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadENS_6ObjPtrINS_6mirror6ObjectEEE", "_ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadEPNS_6mirror6ObjectE", "_ZN3art9JavaVMExt12DecodeGlobalEPv", "_ZN3art9JavaVMExt12DecodeGlobalEPNS_6ThreadEPv", "_ZNK3art6Thread19DecodeGlobalJObjectEP8_jobject", "_ZNK3art6Thread13DecodeJObjectEP8_jobject", "_ZN3art10ThreadList10SuspendAllEPKcb", "_ZN3art10ThreadList10SuspendAllEv", "_ZN3art11ClassLinker12VisitClassesEPNS_12ClassVisitorE", "_ZN3art11ClassLinker12VisitClassesEPFbPNS_6mirror5ClassEPvES4_", "_ZNK3art11ClassLinker17VisitClassLoadersEPNS_18ClassLoaderVisitorE", "_ZN3art6mirror6Object5CloneEPNS_6ThreadE", "_ZN3art6mirror6Object5CloneEPNS_6ThreadEm", "_ZN3art6mirror6Object5CloneEPNS_6ThreadEj", "_ZN3art22IndirectReferenceTable3AddEjPNS_6mirror6ObjectE", "_ZN3art22IndirectReferenceTable3AddENS_15IRTSegmentStateENS_6ObjPtrINS_6mirror6ObjectEEE", "_ZN3art2gc4Heap12VisitObjectsEPFvPNS_6mirror6ObjectEPvES5_", "_ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE", "_ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEbiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE", "_ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEjb", "_ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEmb", "_ZN3art12StackVisitor9WalkStackILNS0_16CountTransitionsE0EEEvb", "_ZNK3art12StackVisitor9GetMethodEv", "_ZNK3art12StackVisitor16DescribeLocationEv", "_ZNK3art12StackVisitor24GetCurrentQuickFrameInfoEv", "_ZN3art7Context6CreateEv", "_ZN3art6Thread18GetLongJumpContextEv", "_ZN3art6mirror5Class13GetDescriptorEPNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE", "_ZN3art6mirror5Class11GetLocationEv", "_ZN3art9ArtMethod12PrettyMethodEb", "_ZN3art12PrettyMethodEPNS_9ArtMethodEb", "_ZN3art3Dbg13ConfigureJdwpERKNS_4JDWP11JdwpOptionsE", "_ZN3art31InternalDebuggerControlCallback13StartDebuggerEv", "_ZN3art3Dbg15gDebuggerActiveE", "_ZN3art15instrumentation15Instrumentation20EnableDeoptimizationEv", "_ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEPKc", "_ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEv", "_ZN3art7Runtime19DeoptimizeBootImageEv", "_ZN3art15instrumentation15Instrumentation10DeoptimizeEPNS_9ArtMethodE", "_ZN3art3Dbg9StartJdwpEv", "_ZN3art3Dbg8GoActiveEv", "_ZN3art3Dbg21RequestDeoptimizationERKNS_21DeoptimizationRequestE", "_ZN3art3Dbg20ManageDeoptimizationEv", "_ZN3art3Dbg9gRegistryE", "_ZN3art3jni12JniIdManager14DecodeMethodIdEP10_jmethodID", "_ZN3art3jni12JniIdManager13DecodeFieldIdEP9_jfieldID", "_ZN3art11interpreter18GetNterpEntryPointEv", "_ZN3art7Monitor17TranslateLocationEPNS_9ArtMethodEjPPKcPi"]) } : { functions: { _Z20dvmDecodeIndirectRefP6ThreadP8_jobject: ["dvmDecodeIndirectRef", "pointer", ["pointer", "pointer"]], _Z15dvmUseJNIBridgeP6MethodPv: ["dvmUseJNIBridge", "void", ["pointer", "pointer"]], _Z20dvmHeapSourceGetBasev: ["dvmHeapSourceGetBase", "pointer", []], _Z21dvmHeapSourceGetLimitv: ["dvmHeapSourceGetLimit", "pointer", []], _Z16dvmIsValidObjectPK6Object: ["dvmIsValidObject", "uint8", ["pointer"]], JNI_GetCreatedJavaVMs: ["JNI_GetCreatedJavaVMs", "int", ["pointer", "int", "pointer"]] }, variables: { gDvmJni: function (u) { this.gDvmJni = u }, gDvm: function (u) { this.gDvm = u } } }, { functions: s = {}, variables: l = {}, optionals: a = new Set } = i, c = []; for (let [u, _] of Object.entries(s)) { let h = o.find(u); h !== null ? typeof _ == "function" ? _.call(o, h) : o[_[0]] = new NativeFunction(h, _[1], _[2], K) : a.has(u) || c.push(u) } for (let [u, _] of Object.entries(l)) { let h = o.find(u); h !== null ? _.call(o, h) : a.has(u) || c.push(u) } if (c.length > 0) throw new Error("Java API only partially available; please file a bug. Missing: " + c.join(", ")); let d = Memory.alloc(v), p = Memory.alloc(Ka); if (fe("JNI_GetCreatedJavaVMs", o.JNI_GetCreatedJavaVMs(d, 1, p)), p.readInt() === 0) return null; if (o.vm = d.readPointer(), r) { let u = ne(), _; u >= 27 ? _ = 33554432 : u >= 24 ? _ = 16777216 : _ = 0, o.kAccCompileDontBother = _; let h = o.vm.add(v).readPointer(); o.artRuntime = h; let g = No(o), b = g.offset, E = b.instrumentation; o.artInstrumentation = E !== null ? h.add(E) : null, Yn() >= 36e7 && o.artInstrumentation != null && (o.artInstrumentation = o.artInstrumentation.readPointer()), o.artHeap = h.add(b.heap).readPointer(), o.artThreadList = h.add(b.threadList).readPointer(); let A = h.add(b.classLinker).readPointer(), M = sc(h, g).offset, O = A.add(M.quickResolutionTrampoline).readPointer(), k = A.add(M.quickImtConflictTrampoline).readPointer(), N = A.add(M.quickGenericJniTrampoline).readPointer(), S = A.add(M.quickToInterpreterBridgeTrampoline).readPointer(); o.artClassLinker = { address: A, quickResolutionTrampoline: O, quickImtConflictTrampoline: k, quickGenericJniTrampoline: N, quickToInterpreterBridgeTrampoline: S }; let x = new Ae(o); o.artQuickGenericJniTrampoline = Pn(N, x), o.artQuickToInterpreterBridge = Pn(S, x), o.artQuickResolutionTrampoline = Pn(O, x), o["art::JavaVMExt::AddGlobalRef"] === void 0 && (o["art::JavaVMExt::AddGlobalRef"] = td(o)), o["art::JavaVMExt::DecodeGlobal"] === void 0 && (o["art::JavaVMExt::DecodeGlobal"] = nd(o)), o["art::ArtMethod::PrettyMethod"] === void 0 && (o["art::ArtMethod::PrettyMethod"] = o["art::ArtMethod::PrettyMethodNullSafe"]), o["art::interpreter::GetNterpEntryPoint"] !== void 0 ? o.artNterpEntryPoint = o["art::interpreter::GetNterpEntryPoint"]() : o.artNterpEntryPoint = o.find("ExecuteNterpImpl"), se = Cc(o, x), sd(o); let j = null; Object.defineProperty(o, "jvmti", { get() { return j === null && (j = [Jl(x, this.artRuntime)]), j[0] } }) } let f = e.enumerateImports().filter(u => u.name.indexOf("_Z") === 0).reduce((u, _) => (u[_.name] = _.address, u), {}); return o.$new = new NativeFunction(f._Znwm || f._Znwj, "pointer", ["ulong"], K), o.$delete = new NativeFunction(f._ZdlPv, "void", ["pointer"], K), Mo = r ? Zn : qn, o } function Jl(t, e) { let n = null; return t.perform(() => { let r = G().find("_ZN3art7Runtime18EnsurePluginLoadedEPKcPNSt3__112basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEE"); if (r === null) return; let o = new NativeFunction(r, "bool", ["pointer", "pointer", "pointer"]), i = Memory.alloc(v); if (!o(e, Memory.allocUtf8String("libopenjdkjvmti.so"), i)) return; let l = Tt.v1_2 | 1073741824, a = t.tryGetEnvHandle(l); if (a === null) return; n = new ke(a, t); let c = Memory.alloc(8); c.writeU64(At.canTagObjects), n.addCapabilities(c) !== 0 && (n = null) }), n } function Gl(t, e) { G().flavor === "art" && t.getClassName(e) } function $l(t) { return { offset: v === 4 ? { globalsLock: 32, globals: 72 } : { globalsLock: 64, globals: 112 } } } function Hl(t) { let e = t.vm, n = t.artRuntime, r = v === 4 ? 200 : 384, o = r + 100 * v, i = ne(), s = ko(), { isApiLevel34OrApexEquivalent: l } = t, a = null; for (let d = r; d !== o; d += v)if (n.add(d).readPointer().equals(e)) { let f, u = null; i >= 33 || s === "Tiramisu" || l ? (f = [d - 4 * v], u = d - v) : i >= 30 || s === "R" ? (f = [d - 3 * v, d - 4 * v], u = d - v) : i >= 29 ? f = [d - 2 * v] : i >= 27 ? f = [d - ft - 3 * v] : f = [d - ft - 2 * v]; for (let _ of f) { let h = _ - v, g = h - v, b; l ? b = g - 9 * v : i >= 24 ? b = g - 8 * v : i >= 23 ? b = g - 7 * v : b = g - 4 * v; let E = { offset: { heap: b, threadList: g, internTable: h, classLinker: _, jniIdManager: u } }; if (Oo(n, E) !== null) { a = E; break } } break } if (a === null) throw new Error("Unable to determine Runtime field offsets"); let c = Yn() >= 36e7; return a.offset.instrumentation = c ? Yl(t) : ql(t), a.offset.jniIdsIndirection = nc(t), a } function ql(t) { let e = t["art::Runtime::DeoptimizeBootImage"]; return e === void 0 ? null : Me(e, Zl[Process.arch], { limit: 30 }) } function bo(t) { if (t.mnemonic !== "lea") return null; let e = t.operands[1].value.disp; return e < 256 || e > 1024 ? null : e } function Wl(t) { if (t.mnemonic !== "add.w") return null; let e = t.operands; if (e.length !== 3) return null; let n = e[2]; return n.type !== "imm" ? null : n.value } function Kl(t) { if (t.mnemonic !== "add") return null; let e = t.operands; if (e.length !== 3 || e[0].value === "sp" || e[1].value === "sp") return null; let n = e[2]; if (n.type !== "imm") return null; let r = n.value.valueOf(); return r < 256 || r > 1024 ? null : r } function Yl(t) { let e = t["art::Runtime::DeoptimizeBootImage"]; return e === void 0 ? null : Me(e, Ql[Process.arch], { limit: 30 }) } function yo(t) { if (t.mnemonic !== "mov") return null; let e = t.operands; if (e[0].value !== "rax") return null; let r = e[1]; if (r.type !== "mem") return null; let o = r.value; if (o.base !== "rdi") return null; let i = o.disp; return i < 256 || i > 1024 ? null : i } function Xl(t) { return null } function ec(t) { if (t.mnemonic !== "ldr") return null; let e = t.operands; if (e[0].value === "x0") return null; let n = e[1].value; if (n.base !== "x0") return null; let r = n.disp; return r < 256 || r > 1024 ? null : r } function nc(t) { let e = t.find("_ZN3art7Runtime12SetJniIdTypeENS_9JniIdTypeE"); if (e === null) return null; let n = Me(e, tc[Process.arch], { limit: 20 }); if (n === null) throw new Error("Unable to determine Runtime.jni_ids_indirection_ offset"); return n } function Eo(t) { return t.mnemonic === "cmp" ? t.operands[0].value.disp : null } function rc(t) { return t.mnemonic === "ldr.w" ? t.operands[1].value.disp : null } function oc(t, e) { if (e === null) return null; let { mnemonic: n } = t, { mnemonic: r } = e; return n === "cmp" && r === "ldr" || n === "bl" && r === "str" ? e.operands[1].value.disp : null } function ic() { let e = { "4-21": 136, "4-22": 136, "4-23": 172, "4-24": 196, "4-25": 196, "4-26": 196, "4-27": 196, "4-28": 212, "4-29": 172, "4-30": 180, "4-31": 180, "8-21": 224, "8-22": 224, "8-23": 296, "8-24": 344, "8-25": 344, "8-26": 352, "8-27": 352, "8-28": 392, "8-29": 328, "8-30": 336, "8-31": 336 }[`${v}-${ne()}`]; if (e === void 0) throw new Error("Unable to determine Instrumentation field offsets"); return { offset: { forcedInterpretOnly: 4, deoptimizationEnabled: e } } } function sc(t, e) { let n = Oo(t, e); if (n === null) throw new Error("Unable to determine ClassLinker field offsets"); return n } function Oo(t, e) { if (jn !== null) return jn; let { classLinker: n, internTable: r } = e.offset, o = t.add(n).readPointer(), i = t.add(r).readPointer(), s = v === 4 ? 100 : 200, l = s + 100 * v, a = ne(), c = null; for (let d = s; d !== l; d += v)if (o.add(d).readPointer().equals(i)) { let f; a >= 30 || ko() === "R" ? f = 6 : a >= 29 ? f = 4 : a >= 23 ? f = 3 : f = 5; let u = d + f * v, _; a >= 23 ? _ = u - 2 * v : _ = u - 3 * v, c = { offset: { quickResolutionTrampoline: _, quickImtConflictTrampoline: u - v, quickGenericJniTrampoline: u, quickToInterpreterBridgeTrampoline: u + v } }; break } return c !== null && (jn = c), c } function er(t) { let n = null; return t.perform(r => { let o = Jt(t), i = be(t), s = { artArrayLengthSize: 4, artArrayEntrySize: o.size, artArrayMax: 50 }, l = { artArrayLengthSize: v, artArrayEntrySize: i.size, artArrayMax: 100 }, a = (f, u, _) => { let h = f.add(u).readPointer(); if (h.isNull()) return null; let g = _ === 4 ? h.readU32() : h.readU64().valueOf(); return g <= 0 ? null : { length: g, data: h.add(_) } }, c = (f, u, _, h) => { try { let g = a(f, u, h.artArrayLengthSize); if (g === null) return !1; let b = Math.min(g.length, h.artArrayMax); for (let E = 0; E !== b; E++)if (g.data.add(E * h.artArrayEntrySize).equals(_)) return !0 } catch { } return !1 }, d = r.findClass("java/lang/Thread"), p = r.newGlobalRef(d); try { let f; Se(t, r, N => { f = G()["art::JavaVMExt::DecodeGlobal"](t, N, p) }); let u = wo(r.getFieldId(p, "name", "Ljava/lang/String;")), _ = wo(r.getStaticFieldId(p, "MAX_PRIORITY", "I")), h = -1, g = -1; for (let N = 0; N !== 256; N += 4)h === -1 && c(f, N, _, s) && (h = N), g === -1 && c(f, N, u, s) && (g = N); if (g === -1 || h === -1) throw new Error("Unable to find fields in java/lang/Thread; please file a bug"); let b = g !== h ? h : 0, E = g, C = -1, A = ar(r.getMethodId(p, "getName", "()Ljava/lang/String;")); for (let N = 0; N !== 256; N += 4)C === -1 && c(f, N, A, l) && (C = N); if (C === -1) throw new Error("Unable to find methods in java/lang/Thread; please file a bug"); let M = -1, k = a(f, C, l.artArrayLengthSize).length; for (let N = C; N !== 256; N += 4)if (f.add(N).readU16() === k) { M = N; break } if (M === -1) throw new Error("Unable to find copied methods in java/lang/Thread; please file a bug"); n = { offset: { ifields: E, methods: C, sfields: b, copiedMethodsOffset: M } } } finally { r.deleteLocalRef(d), r.deleteGlobalRef(p) } }), n } function ac(t) { let e = G(), n; return t.perform(r => { let o = r.findClass("android/os/Process"), i = ar(r.getStaticMethodId(o, "getElapsedCpuTime", "()J")); r.deleteLocalRef(o); let s = Process.getModuleByName("libandroid_runtime.so"), l = s.base, a = l.add(s.size), c = ne(), d = c <= 21 ? 8 : v, p = tl | nl | rl | Rt, f = ~(xo | cl | ll) >>> 0, u = null, _ = null, h = 2; for (let E = 0; E !== 64 && h !== 0; E += 4) { let C = i.add(E); if (u === null) { let A = C.readPointer(); A.compare(l) >= 0 && A.compare(a) < 0 && (u = E, h--) } _ === null && (C.readU32() & f) === p && (_ = E, h--) } if (h !== 0) throw new Error("Unable to determine ArtMethod field offsets"); let g = u + d; n = { size: c <= 21 ? g + 32 : g + v, offset: { jniCode: u, quickCode: g, accessFlags: _ } }, "artInterpreterToCompiledCodeBridge" in e && (n.offset.interpreterCode = u - d) }), n } function Jt(t) { let e = ne(); return e >= 23 ? { size: 16, offset: { accessFlags: 4 } } : e >= 21 ? { size: 24, offset: { accessFlags: 12 } } : null } function lc(t) { let e = ne(), n; return t.perform(r => { let o = Gt(r), i = r.handle, s = null, l = null, a = null, c = null, d = null, p = null; for (let f = 144; f !== 256; f += v)if (o.add(f).readPointer().equals(i)) { l = f - 6 * v, d = f - 4 * v, p = f + 2 * v, e <= 22 && (l -= v, s = l - v - 9 * 8 - 3 * 4, a = f + 6 * v, d -= v, p -= v), c = f + 9 * v, e <= 22 && (c += 2 * v + 4, v === 8 && (c += 4)), e >= 23 && (c += v); break } if (c === null) throw new Error("Unable to determine ArtThread field offsets"); n = { offset: { isExceptionReportedToInstrumentation: s, exception: l, throwLocation: a, topHandleScope: c, managedStack: d, self: p } } }), n } function cc() { return ne() >= 23 ? { offset: { topQuickFrame: 0, link: v } } : { offset: { topQuickFrame: 2 * v, link: 0 } } } function Pn(t, e) { let n; return e.perform(r => { let o = Gt(r), i = dc[Process.arch], s = Instruction.parse(t), l = i(s); l !== null ? n = o.add(l).readPointer() : n = t }), n } function vo(t) { return t.mnemonic === "jmp" ? t.operands[0].value.disp : null } function uc(t) { return t.mnemonic === "ldr.w" ? t.operands[1].value.disp : null } function pc(t) { return t.mnemonic === "ldr" ? t.operands[1].value.disp : null } function Gt(t) { return t.handle.add(v).readPointer() } function fc() { return tr("ro.build.version.release") } function hc() { return tr("ro.build.version.codename") } function _c() { return parseInt(tr("ro.build.version.sdk"), 10) } function mc() {
  try {
    let t = File.readAllText("/proc/self/mountinfo"), e = null, n = new Map; for (let o of t.trimEnd().split(`
`)) { let i = o.split(" "), s = i[4]; if (!s.startsWith("/apex/com.android.art")) continue; let l = i[10]; s.includes("@") ? n.set(l, s.split("@")[1]) : e = l } let r = n.get(e); return r !== void 0 ? parseInt(r) : So()
  } catch { return So() }
} function So() { return ne() * 1e7 } function tr(t) { Fn === null && (Fn = new NativeFunction(Process.getModuleByName("libc.so").getExportByName("__system_property_get"), "int", ["pointer", "pointer"], K)); let e = Memory.alloc(gc); return Fn(Memory.allocUtf8String(t), e), e.readUtf8String() } function Se(t, e, n) { let r = Dl(t, e), o = Gt(e).toString(); if (dt[o] = n, r(e.handle), dt[o] !== void 0) throw delete dt[o], new Error("Unable to perform state transition; please file a bug") } function bc(t, e) { let n = new NativeCallback(yc, "void", ["pointer"]); return Fo(t, e, n) } function yc(t) { let e = t.toString(), n = dt[e]; delete dt[e], n(t) } function nr(t) { let e = G(), n = e.artThreadList; e["art::ThreadList::SuspendAll"](n, Memory.allocUtf8String("frida"), !1 ? 1 : 0); try { t() } finally { e["art::ThreadList::ResumeAll"](n) } } function rr(t) { return G()["art::ClassLinker::VisitClasses"] instanceof NativeFunction ? new Vn(t) : new NativeCallback(n => t(n) === !0 ? 1 : 0, "bool", ["pointer", "pointer"]) } function or(t) { return new Jn(t) } function vc(t) { return function (e) { let n = Memory.alloc(12); return Ul(t)(n, e), { frameSizeInBytes: n.readU32(), coreSpillMask: n.add(4).readU32(), fpSpillMask: n.add(8).readU32() } } } function Sc(t) { let e = NULL; switch (Process.arch) { case "ia32": e = Qe(32, n => { n.putMovRegRegOffsetPtr("ecx", "esp", 4), n.putMovRegRegOffsetPtr("edx", "esp", 8), n.putCallAddressWithArguments(t, ["ecx", "edx"]), n.putMovRegReg("esp", "ebp"), n.putPopReg("ebp"), n.putRet() }); break; case "x64": e = Qe(32, n => { n.putPushReg("rdi"), n.putCallAddressWithArguments(t, ["rsi"]), n.putPopReg("rdi"), n.putMovRegPtrReg("rdi", "rax"), n.putMovRegOffsetPtrReg("rdi", 8, "edx"), n.putRet() }); break; case "arm": e = Qe(16, n => { n.putCallAddressWithArguments(t, ["r0", "r1"]), n.putPopRegs(["r0", "lr"]), n.putMovRegReg("pc", "lr") }); break; case "arm64": e = Qe(64, n => { n.putPushRegReg("x0", "lr"), n.putCallAddressWithArguments(t, ["x1"]), n.putPopRegReg("x2", "lr"), n.putStrRegRegOffset("x0", "x2", 0), n.putStrRegRegOffset("w1", "x2", 8), n.putRet() }); break }return new NativeFunction(e, "void", ["pointer", "pointer"], K) } function Qe(t, e) { On === null && (On = Memory.alloc(Process.pageSize)); let n = On.add(_o), r = Process.arch, o = $n[r]; return Memory.patchCode(n, t, i => { let s = new o(i, { pc: n }); if (e(s), s.flush(), s.offset > t) throw new Error(`Wrote ${s.offset}, exceeding maximum of ${t}`) }), _o += t, r === "arm" ? n.or(1) : n } function Ic(t, e) { Tc(e), kc(e) } function Cc(t, e) {
  let n = Ye(e).offset, r = Fl().offset, o = `
#include <gum/guminterceptor.h>

extern GMutex lock;
extern GHashTable * methods;
extern GHashTable * replacements;
extern gpointer last_seen_art_method;

extern gpointer get_oat_quick_method_header_impl (gpointer method, gpointer pc);

void
init (void)
{
  g_mutex_init (&lock);
  methods = g_hash_table_new_full (NULL, NULL, NULL, NULL);
  replacements = g_hash_table_new_full (NULL, NULL, NULL, NULL);
}

void
finalize (void)
{
  g_hash_table_unref (replacements);
  g_hash_table_unref (methods);
  g_mutex_clear (&lock);
}

gboolean
is_replacement_method (gpointer method)
{
  gboolean is_replacement;

  g_mutex_lock (&lock);

  is_replacement = g_hash_table_contains (replacements, method);

  g_mutex_unlock (&lock);

  return is_replacement;
}

gpointer
get_replacement_method (gpointer original_method)
{
  gpointer replacement_method;

  g_mutex_lock (&lock);

  replacement_method = g_hash_table_lookup (methods, original_method);

  g_mutex_unlock (&lock);

  return replacement_method;
}

void
set_replacement_method (gpointer original_method,
                        gpointer replacement_method)
{
  g_mutex_lock (&lock);

  g_hash_table_insert (methods, original_method, replacement_method);
  g_hash_table_insert (replacements, replacement_method, original_method);

  g_mutex_unlock (&lock);
}

void
synchronize_replacement_methods (guint quick_code_offset,
                                 void * nterp_entrypoint,
                                 void * quick_to_interpreter_bridge)
{
  GHashTableIter iter;
  gpointer hooked_method, replacement_method;

  g_mutex_lock (&lock);

  g_hash_table_iter_init (&iter, methods);
  while (g_hash_table_iter_next (&iter, &hooked_method, &replacement_method))
  {
    void ** quick_code;

    *((uint32_t *) replacement_method) = *((uint32_t *) hooked_method);

    quick_code = hooked_method + quick_code_offset;
    if (*quick_code == nterp_entrypoint)
      *quick_code = quick_to_interpreter_bridge;
  }

  g_mutex_unlock (&lock);
}

void
delete_replacement_method (gpointer original_method)
{
  gpointer replacement_method;

  g_mutex_lock (&lock);

  replacement_method = g_hash_table_lookup (methods, original_method);
  if (replacement_method != NULL)
  {
    g_hash_table_remove (methods, original_method);
    g_hash_table_remove (replacements, replacement_method);
  }

  g_mutex_unlock (&lock);
}

gpointer
translate_method (gpointer method)
{
  gpointer translated_method;

  g_mutex_lock (&lock);

  translated_method = g_hash_table_lookup (replacements, method);

  g_mutex_unlock (&lock);

  return (translated_method != NULL) ? translated_method : method;
}

gpointer
find_replacement_method_from_quick_code (gpointer method,
                                         gpointer thread)
{
  gpointer replacement_method;
  gpointer managed_stack;
  gpointer top_quick_frame;
  gpointer link_managed_stack;
  gpointer * link_top_quick_frame;

  replacement_method = get_replacement_method (method);
  if (replacement_method == NULL)
    return NULL;

  /*
   * Stack check.
   *
   * Return NULL to indicate that the original method should be invoked, otherwise
   * return a pointer to the replacement ArtMethod.
   *
   * If the caller is our own JNI replacement stub, then a stack transition must
   * have been pushed onto the current thread's linked list.
   *
   * Therefore, we invoke the original method if the following conditions are met:
   *   1- The current managed stack is empty.
   *   2- The ArtMethod * inside the linked managed stack's top quick frame is the
   *      same as our replacement.
   */
  managed_stack = thread + ${n.managedStack};
  top_quick_frame = *((gpointer *) (managed_stack + ${r.topQuickFrame}));
  if (top_quick_frame != NULL)
    return replacement_method;

  link_managed_stack = *((gpointer *) (managed_stack + ${r.link}));
  if (link_managed_stack == NULL)
    return replacement_method;

  link_top_quick_frame = GSIZE_TO_POINTER (*((gsize *) (link_managed_stack + ${r.topQuickFrame})) & ~((gsize) 1));
  if (link_top_quick_frame == NULL || *link_top_quick_frame != replacement_method)
    return replacement_method;

  return NULL;
}

void
on_interpreter_do_call (GumInvocationContext * ic)
{
  gpointer method, replacement_method;

  method = gum_invocation_context_get_nth_argument (ic, 0);

  replacement_method = get_replacement_method (method);
  if (replacement_method != NULL)
    gum_invocation_context_replace_nth_argument (ic, 0, replacement_method);
}

gpointer
on_art_method_get_oat_quick_method_header (gpointer method,
                                           gpointer pc)
{
  if (is_replacement_method (method))
    return NULL;

  return get_oat_quick_method_header_impl (method, pc);
}

void
on_art_method_pretty_method (GumInvocationContext * ic)
{
  const guint this_arg_index = ${Process.arch === "arm64" ? 0 : 1};
  gpointer method;

  method = gum_invocation_context_get_nth_argument (ic, this_arg_index);
  if (method == NULL)
    gum_invocation_context_replace_nth_argument (ic, this_arg_index, last_seen_art_method);
  else
    last_seen_art_method = method;
}

void
on_leave_gc_concurrent_copying_copying_phase (GumInvocationContext * ic)
{
  GHashTableIter iter;
  gpointer hooked_method, replacement_method;

  g_mutex_lock (&lock);

  g_hash_table_iter_init (&iter, methods);
  while (g_hash_table_iter_next (&iter, &hooked_method, &replacement_method))
    *((uint32_t *) replacement_method) = *((uint32_t *) hooked_method);

  g_mutex_unlock (&lock);
}
`, i = 8, s = v, l = v, a = v, d = Memory.alloc(i + s + l + a), p = d.add(i), f = p.add(s), u = f.add(l), _ = t.find(v === 4 ? "_ZN3art9ArtMethod23GetOatQuickMethodHeaderEj" : "_ZN3art9ArtMethod23GetOatQuickMethodHeaderEm"), h = new CModule(o, { lock: d, methods: p, replacements: f, last_seen_art_method: u, get_oat_quick_method_header_impl: _ ?? ptr("0xdeadbeef") }), g = { exceptions: "propagate", scheduling: "exclusive" }; return { handle: h, replacedMethods: { isReplacement: new NativeFunction(h.is_replacement_method, "bool", ["pointer"], g), get: new NativeFunction(h.get_replacement_method, "pointer", ["pointer"], g), set: new NativeFunction(h.set_replacement_method, "void", ["pointer", "pointer"], g), synchronize: new NativeFunction(h.synchronize_replacement_methods, "void", ["uint", "pointer", "pointer"], g), delete: new NativeFunction(h.delete_replacement_method, "void", ["pointer"], g), translate: new NativeFunction(h.translate_method, "pointer", ["pointer"], g), findReplacementFromQuickCode: h.find_replacement_method_from_quick_code }, getOatQuickMethodHeaderImpl: _, hooks: { Interpreter: { doCall: h.on_interpreter_do_call }, ArtMethod: { getOatQuickMethodHeader: h.on_art_method_get_oat_quick_method_header, prettyMethod: h.on_art_method_pretty_method }, Gc: { copyingPhase: { onLeave: h.on_leave_gc_concurrent_copying_copying_phase }, runFlip: { onEnter: h.on_leave_gc_concurrent_copying_copying_phase } } } }
} function Tc(t) { go || (go = !0, Ac(t), xc(), Lc(), Nc()) } function Ac(t) { let e = G();[e.artQuickGenericJniTrampoline, e.artQuickToInterpreterBridge, e.artQuickResolutionTrampoline].forEach(r => { Memory.protect(r, 32, "rwx"); let o = new Ut(r); o.activate(t), jo.push(o) }) } function xc() { let t = G(), e = ne(), { isApiLevel34OrApexEquivalent: n } = t, r; if (e <= 22) r = /^_ZN3art11interpreter6DoCallILb[0-1]ELb[0-1]EEEbPNS_6mirror9ArtMethodEPNS_6ThreadERNS_11ShadowFrameEPKNS_11InstructionEtPNS_6JValueE$/; else if (e <= 33 && !n) r = /^_ZN3art11interpreter6DoCallILb[0-1]ELb[0-1]EEEbPNS_9ArtMethodEPNS_6ThreadERNS_11ShadowFrameEPKNS_11InstructionEtPNS_6JValueE$/; else if (n) r = /^_ZN3art11interpreter6DoCallILb[0-1]EEEbPNS_9ArtMethodEPNS_6ThreadERNS_11ShadowFrameEPKNS_11InstructionEtbPNS_6JValueE$/; else throw new Error("Unable to find method invocation in ART; please file a bug"); let o = t.module, i = [...o.enumerateExports(), ...o.enumerateSymbols()].filter(s => r.test(s.name)); if (i.length === 0) throw new Error("Unable to find method invocation in ART; please file a bug"); for (let s of i) Interceptor.attach(s.address, se.hooks.Interpreter.doCall) } function Lc() { let t = G(), n = t.module.findSymbolByName("_ZN3art2gc4Heap22CollectGarbageInternalENS0_9collector6GcTypeENS0_7GcCauseEbj"); if (n === null) return; let { artNterpEntryPoint: r, artQuickToInterpreterBridge: o } = t, i = be(t.vm).offset.quickCode; Interceptor.attach(n, { onLeave() { se.replacedMethods.synchronize(i, r, o) } }) } function Nc() { let t = [["_ZN3art11ClassLinker26VisiblyInitializedCallback22MarkVisiblyInitializedEPNS_6ThreadE", "e90340f8 : ff0ff0ff"], ["_ZN3art11ClassLinker26VisiblyInitializedCallback29AdjustThreadVisibilityCounterEPNS_6ThreadEl", "7f0f00f9 : 1ffcffff"]], e = G(), n = e.module; for (let [r, o] of t) { let i = n.findSymbolByName(r); if (i === null) continue; let s = Memory.scanSync(i, 8192, o); if (s.length === 0) return; let { artNterpEntryPoint: l, artQuickToInterpreterBridge: a } = e, c = be(e.vm).offset.quickCode; Interceptor.attach(s[0].address, function () { se.replacedMethods.synchronize(c, l, a) }); return } } function kc(t) { if (mo) return; if (mo = !0, !jc()) { let { getOatQuickMethodHeaderImpl: i } = se; if (i === null) return; try { Interceptor.replace(i, se.hooks.ArtMethod.getOatQuickMethodHeader) } catch { } } let e = ne(), n = null, r = G(); e > 28 ? n = r.find("_ZN3art2gc9collector17ConcurrentCopying12CopyingPhaseEv") : e > 22 && (n = r.find("_ZN3art2gc9collector17ConcurrentCopying12MarkingPhaseEv")), n !== null && Interceptor.attach(n, se.hooks.Gc.copyingPhase); let o = null; o = r.find("_ZN3art6Thread15RunFlipFunctionEPS0_"), o === null && (o = r.find("_ZN3art6Thread15RunFlipFunctionEPS0_b")), o !== null && Interceptor.attach(o, se.hooks.Gc.runFlip) } function Dn({ address: t, size: e }) { let n = Instruction.parse(t.or(1)), [r, o] = n.operands, i = o.value.base, s = r.value, l = Instruction.parse(n.next.add(2)), a = ptr(l.operands[0].value), c = l.address.add(l.size), d, p; return l.mnemonic === "beq" ? (d = c, p = a) : (d = a, p = c), Me(d.or(1), f, { limit: 3 }); function f(u) { let { mnemonic: _ } = u; if (!(_ === "ldr" || _ === "ldr.w")) return null; let { base: h, disp: g } = u.operands[1].value; return h === i && g === 20 ? { methodReg: i, scratchReg: s, target: { whenTrue: a, whenRegularMethod: d, whenRuntimeMethod: p } } : null } } function Un({ address: t, size: e }) { let [n, r] = Instruction.parse(t).operands, o = r.value.base, i = "x" + n.value.substring(1), s = Instruction.parse(t.add(8)), l = ptr(s.operands[0].value), a = t.add(12), c, d; return s.mnemonic === "b.eq" ? (c = a, d = l) : (c = l, d = a), Me(c, p, { limit: 3 }); function p(f) { if (f.mnemonic !== "ldr") return null; let { base: u, disp: _ } = f.operands[1].value; return u === o && _ === 24 ? { methodReg: o, scratchReg: i, target: { whenTrue: l, whenRegularMethod: c, whenRuntimeMethod: d } } : null } } function jc() { if (ne() < 31) return !1; let t = Mc[Process.arch]; if (t === void 0) return !1; let e = t.signatures.map(({ pattern: r, offset: o = 0, validateMatch: i = Oc }) => ({ pattern: new MatchPattern(r.join("")), offset: o, validateMatch: i })), n = []; for (let { base: r, size: o } of G().module.enumerateRanges("--x")) for (let { pattern: i, offset: s, validateMatch: l } of e) { let a = Memory.scanSync(r, o, i).map(({ address: c, size: d }) => ({ address: c.sub(s), size: d + s })).filter(c => { let d = l(c); return d === null ? !1 : (c.validationResult = d, !0) }); n.push(...a) } return n.length === 0 ? !1 : (n.forEach(t.instrument), !0) } function Oc() { return {} } function Rc({ address: t, size: e, validationResult: n }) { let { methodReg: r, target: o } = n, i = Memory.alloc(Process.pageSize), s = e; Memory.patchCode(i, 256, l => { let a = new ThumbWriter(l, { pc: i }), c = new ThumbRelocator(t, a); for (let _ = 0; _ !== 2; _++)c.readOne(); c.writeAll(), c.readOne(), c.skipOne(), a.putBCondLabel("eq", "runtime_or_replacement_method"); let d = [45, 237, 16, 10]; a.putBytes(d); let p = ["r0", "r1", "r2", "r3"]; a.putPushRegs(p), a.putCallAddressWithArguments(se.replacedMethods.isReplacement, [r]), a.putCmpRegImm("r0", 0), a.putPopRegs(p); let f = [189, 236, 16, 10]; a.putBytes(f), a.putBCondLabel("ne", "runtime_or_replacement_method"), a.putBLabel("regular_method"), c.readOne(); let u = c.input.address.equals(o.whenRegularMethod); for (a.putLabel(u ? "regular_method" : "runtime_or_replacement_method"), c.writeOne(); s < 10;) { let _ = c.readOne(); if (_ === 0) { s = 10; break } s = _ } c.writeAll(), a.putBranchAddress(t.add(s + 1)), a.putLabel(u ? "runtime_or_replacement_method" : "regular_method"), a.putBranchAddress(o.whenTrue), a.flush() }), Xn.push(new Dt(t, s, i)), Memory.patchCode(t, s, l => { let a = new ThumbWriter(l, { pc: t }); a.putLdrRegAddress("pc", i.or(1)), a.flush() }) } function Pc({ address: t, size: e, validationResult: n }) { let { methodReg: r, scratchReg: o, target: i } = n, s = Memory.alloc(Process.pageSize); Memory.patchCode(s, 256, l => { let a = new Arm64Writer(l, { pc: s }), c = new Arm64Relocator(t, a); for (let _ = 0; _ !== 2; _++)c.readOne(); c.writeAll(), c.readOne(), c.skipOne(), a.putBCondLabel("eq", "runtime_or_replacement_method"); let d = ["d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8", "x9", "x10", "x11", "x12", "x13", "x14", "x15", "x16", "x17"], p = d.length; for (let _ = 0; _ !== p; _ += 2)a.putPushRegReg(d[_], d[_ + 1]); a.putCallAddressWithArguments(se.replacedMethods.isReplacement, [r]), a.putCmpRegReg("x0", "xzr"); for (let _ = p - 2; _ >= 0; _ -= 2)a.putPopRegReg(d[_], d[_ + 1]); a.putBCondLabel("ne", "runtime_or_replacement_method"), a.putBLabel("regular_method"), c.readOne(); let f = c.input, u = f.address.equals(i.whenRegularMethod); a.putLabel(u ? "regular_method" : "runtime_or_replacement_method"), c.writeOne(), a.putBranchAddress(f.next), a.putLabel(u ? "runtime_or_replacement_method" : "regular_method"), a.putBranchAddress(i.whenTrue), a.flush() }), Xn.push(new Dt(t, e, s)), Memory.patchCode(t, e, l => { let a = new Arm64Writer(l, { pc: t }); a.putLdrRegAddress(o, s), a.putBrReg(o), a.flush() }) } function Fc(t) { return new Mo(t) } function Dc(t) { return se.replacedMethods.translate(t) } function ir(t, e = {}) { let { limit: n = 16 } = e, r = t.getEnv(); return ut === null && (ut = Uc(t, r)), ut.backtrace(r, n) } function Uc(t, e) {
  let n = G(), r = Memory.alloc(Process.pointerSize), o = new CModule(`
#include <glib.h>
#include <stdbool.h>
#include <string.h>
#include <gum/gumtls.h>
#include <json-glib/json-glib.h>

typedef struct _ArtBacktrace ArtBacktrace;
typedef struct _ArtStackFrame ArtStackFrame;

typedef struct _ArtStackVisitor ArtStackVisitor;
typedef struct _ArtStackVisitorVTable ArtStackVisitorVTable;

typedef struct _ArtClass ArtClass;
typedef struct _ArtMethod ArtMethod;
typedef struct _ArtThread ArtThread;
typedef struct _ArtContext ArtContext;

typedef struct _JNIEnv JNIEnv;

typedef struct _StdString StdString;
typedef struct _StdTinyString StdTinyString;
typedef struct _StdLargeString StdLargeString;

typedef enum {
  STACK_WALK_INCLUDE_INLINED_FRAMES,
  STACK_WALK_SKIP_INLINED_FRAMES,
} StackWalkKind;

struct _StdTinyString
{
  guint8 unused;
  gchar data[(3 * sizeof (gpointer)) - 1];
};

struct _StdLargeString
{
  gsize capacity;
  gsize size;
  gchar * data;
};

struct _StdString
{
  union
  {
    guint8 flags;
    StdTinyString tiny;
    StdLargeString large;
  };
};

struct _ArtBacktrace
{
  GChecksum * id;
  GArray * frames;
  gchar * frames_json;
};

struct _ArtStackFrame
{
  ArtMethod * method;
  gsize dexpc;
  StdString description;
};

struct _ArtStackVisitorVTable
{
  void (* unused1) (void);
  void (* unused2) (void);
  bool (* visit) (ArtStackVisitor * visitor);
};

struct _ArtStackVisitor
{
  ArtStackVisitorVTable * vtable;

  guint8 padding[512];

  ArtStackVisitorVTable vtable_storage;

  ArtBacktrace * backtrace;
};

struct _ArtMethod
{
  guint32 declaring_class;
  guint32 access_flags;
};

extern GumTlsKey current_backtrace;

extern void (* perform_art_thread_state_transition) (JNIEnv * env);

extern ArtContext * art_make_context (ArtThread * thread);

extern void art_stack_visitor_init (ArtStackVisitor * visitor, ArtThread * thread, void * context, StackWalkKind walk_kind,
    size_t num_frames, bool check_suspended);
extern void art_stack_visitor_walk_stack (ArtStackVisitor * visitor, bool include_transitions);
extern ArtMethod * art_stack_visitor_get_method (ArtStackVisitor * visitor);
extern void art_stack_visitor_describe_location (StdString * description, ArtStackVisitor * visitor);
extern ArtMethod * translate_method (ArtMethod * method);
extern void translate_location (ArtMethod * method, guint32 pc, const gchar ** source_file, gint32 * line_number);
extern void get_class_location (StdString * result, ArtClass * klass);
extern void cxx_delete (void * mem);
extern unsigned long strtoul (const char * str, char ** endptr, int base);

static bool visit_frame (ArtStackVisitor * visitor);
static void art_stack_frame_destroy (ArtStackFrame * frame);

static void append_jni_type_name (GString * s, const gchar * name, gsize length);

static void std_string_destroy (StdString * str);
static gchar * std_string_get_data (StdString * str);

void
init (void)
{
  current_backtrace = gum_tls_key_new ();
}

void
finalize (void)
{
  gum_tls_key_free (current_backtrace);
}

ArtBacktrace *
_create (JNIEnv * env,
         guint limit)
{
  ArtBacktrace * bt;

  bt = g_new (ArtBacktrace, 1);
  bt->id = g_checksum_new (G_CHECKSUM_SHA1);
  bt->frames = (limit != 0)
      ? g_array_sized_new (FALSE, FALSE, sizeof (ArtStackFrame), limit)
      : g_array_new (FALSE, FALSE, sizeof (ArtStackFrame));
  g_array_set_clear_func (bt->frames, (GDestroyNotify) art_stack_frame_destroy);
  bt->frames_json = NULL;

  gum_tls_key_set_value (current_backtrace, bt);

  perform_art_thread_state_transition (env);

  gum_tls_key_set_value (current_backtrace, NULL);

  return bt;
}

void
_on_thread_state_transition_complete (ArtThread * thread)
{
  ArtContext * context;
  ArtStackVisitor visitor = {
    .vtable_storage = {
      .visit = visit_frame,
    },
  };

  context = art_make_context (thread);

  art_stack_visitor_init (&visitor, thread, context, STACK_WALK_SKIP_INLINED_FRAMES, 0, true);
  visitor.vtable = &visitor.vtable_storage;
  visitor.backtrace = gum_tls_key_get_value (current_backtrace);

  art_stack_visitor_walk_stack (&visitor, false);

  cxx_delete (context);
}

static bool
visit_frame (ArtStackVisitor * visitor)
{
  ArtBacktrace * bt = visitor->backtrace;
  ArtStackFrame frame;
  const gchar * description, * dexpc_part;

  frame.method = art_stack_visitor_get_method (visitor);

  art_stack_visitor_describe_location (&frame.description, visitor);

  description = std_string_get_data (&frame.description);
  if (strstr (description, " '<") != NULL)
    goto skip;

  dexpc_part = strstr (description, " at dex PC 0x");
  if (dexpc_part == NULL)
    goto skip;
  frame.dexpc = strtoul (dexpc_part + 13, NULL, 16);

  g_array_append_val (bt->frames, frame);

  g_checksum_update (bt->id, (guchar *) &frame.method, sizeof (frame.method));
  g_checksum_update (bt->id, (guchar *) &frame.dexpc, sizeof (frame.dexpc));

  return true;

skip:
  std_string_destroy (&frame.description);
  return true;
}

static void
art_stack_frame_destroy (ArtStackFrame * frame)
{
  std_string_destroy (&frame->description);
}

void
_destroy (ArtBacktrace * backtrace)
{
  g_free (backtrace->frames_json);
  g_array_free (backtrace->frames, TRUE);
  g_checksum_free (backtrace->id);
  g_free (backtrace);
}

const gchar *
_get_id (ArtBacktrace * backtrace)
{
  return g_checksum_get_string (backtrace->id);
}

const gchar *
_get_frames (ArtBacktrace * backtrace)
{
  GArray * frames = backtrace->frames;
  JsonBuilder * b;
  guint i;
  JsonNode * root;

  if (backtrace->frames_json != NULL)
    return backtrace->frames_json;

  b = json_builder_new_immutable ();

  json_builder_begin_array (b);

  for (i = 0; i != frames->len; i++)
  {
    ArtStackFrame * frame = &g_array_index (frames, ArtStackFrame, i);
    gchar * description, * ret_type, * paren_open, * paren_close, * arg_types, * token, * method_name, * class_name;
    GString * signature;
    gchar * cursor;
    ArtMethod * translated_method;
    StdString location;
    gsize dexpc;
    const gchar * source_file;
    gint32 line_number;

    description = std_string_get_data (&frame->description);

    ret_type = strchr (description, '\\'') + 1;

    paren_open = strchr (ret_type, '(');
    paren_close = strchr (paren_open, ')');
    *paren_open = '\\0';
    *paren_close = '\\0';

    arg_types = paren_open + 1;

    token = strrchr (ret_type, '.');
    *token = '\\0';

    method_name = token + 1;

    token = strrchr (ret_type, ' ');
    *token = '\\0';

    class_name = token + 1;

    signature = g_string_sized_new (128);

    append_jni_type_name (signature, class_name, method_name - class_name - 1);
    g_string_append_c (signature, ',');
    g_string_append (signature, method_name);
    g_string_append (signature, ",(");

    if (arg_types != paren_close)
    {
      for (cursor = arg_types; cursor != NULL;)
      {
        gsize length;
        gchar * next;

        token = strstr (cursor, ", ");
        if (token != NULL)
        {
          length = token - cursor;
          next = token + 2;
        }
        else
        {
          length = paren_close - cursor;
          next = NULL;
        }

        append_jni_type_name (signature, cursor, length);

        cursor = next;
      }
    }

    g_string_append_c (signature, ')');

    append_jni_type_name (signature, ret_type, class_name - ret_type - 1);

    translated_method = translate_method (frame->method);
    dexpc = (translated_method == frame->method) ? frame->dexpc : 0;

    get_class_location (&location, GSIZE_TO_POINTER (translated_method->declaring_class));

    translate_location (translated_method, dexpc, &source_file, &line_number);

    json_builder_begin_object (b);

    json_builder_set_member_name (b, "signature");
    json_builder_add_string_value (b, signature->str);

    json_builder_set_member_name (b, "origin");
    json_builder_add_string_value (b, std_string_get_data (&location));

    json_builder_set_member_name (b, "className");
    json_builder_add_string_value (b, class_name);

    json_builder_set_member_name (b, "methodName");
    json_builder_add_string_value (b, method_name);

    json_builder_set_member_name (b, "methodFlags");
    json_builder_add_int_value (b, translated_method->access_flags);

    json_builder_set_member_name (b, "fileName");
    json_builder_add_string_value (b, source_file);

    json_builder_set_member_name (b, "lineNumber");
    json_builder_add_int_value (b, line_number);

    json_builder_end_object (b);

    std_string_destroy (&location);
    g_string_free (signature, TRUE);
  }

  json_builder_end_array (b);

  root = json_builder_get_root (b);
  backtrace->frames_json = json_to_string (root, FALSE);
  json_node_unref (root);

  return backtrace->frames_json;
}

static void
append_jni_type_name (GString * s,
                      const gchar * name,
                      gsize length)
{
  gchar shorty = '\\0';
  gsize i;

  switch (name[0])
  {
    case 'b':
      if (strncmp (name, "boolean", length) == 0)
        shorty = 'Z';
      else if (strncmp (name, "byte", length) == 0)
        shorty = 'B';
      break;
    case 'c':
      if (strncmp (name, "char", length) == 0)
        shorty = 'C';
      break;
    case 'd':
      if (strncmp (name, "double", length) == 0)
        shorty = 'D';
      break;
    case 'f':
      if (strncmp (name, "float", length) == 0)
        shorty = 'F';
      break;
    case 'i':
      if (strncmp (name, "int", length) == 0)
        shorty = 'I';
      break;
    case 'l':
      if (strncmp (name, "long", length) == 0)
        shorty = 'J';
      break;
    case 's':
      if (strncmp (name, "short", length) == 0)
        shorty = 'S';
      break;
    case 'v':
      if (strncmp (name, "void", length) == 0)
        shorty = 'V';
      break;
  }

  if (shorty != '\\0')
  {
    g_string_append_c (s, shorty);

    return;
  }

  if (length > 2 && name[length - 2] == '[' && name[length - 1] == ']')
  {
    g_string_append_c (s, '[');
    append_jni_type_name (s, name, length - 2);

    return;
  }

  g_string_append_c (s, 'L');

  for (i = 0; i != length; i++)
  {
    gchar ch = name[i];
    if (ch != '.')
      g_string_append_c (s, ch);
    else
      g_string_append_c (s, '/');
  }

  g_string_append_c (s, ';');
}

static void
std_string_destroy (StdString * str)
{
  bool is_large = (str->flags & 1) != 0;
  if (is_large)
    cxx_delete (str->large.data);
}

static gchar *
std_string_get_data (StdString * str)
{
  bool is_large = (str->flags & 1) != 0;
  return is_large ? str->large.data : str->tiny.data;
}
`, { current_backtrace: Memory.alloc(Process.pointerSize), perform_art_thread_state_transition: r, art_make_context: n["art::Thread::GetLongJumpContext"] ?? n["art::Context::Create"], art_stack_visitor_init: n["art::StackVisitor::StackVisitor"], art_stack_visitor_walk_stack: n["art::StackVisitor::WalkStack"], art_stack_visitor_get_method: n["art::StackVisitor::GetMethod"], art_stack_visitor_describe_location: n["art::StackVisitor::DescribeLocation"], translate_method: se.replacedMethods.translate, translate_location: n["art::Monitor::TranslateLocation"], get_class_location: n["art::mirror::Class::GetLocation"], cxx_delete: n.$delete, strtoul: Process.getModuleByName("libc.so").getExportByName("strtoul") }), i = new NativeFunction(o._create, "pointer", ["pointer", "uint"], K), s = new NativeFunction(o._destroy, "void", ["pointer"], K), l = { exceptions: "propagate", scheduling: "exclusive" }, a = new NativeFunction(o._get_id, "pointer", ["pointer"], l), c = new NativeFunction(o._get_frames, "pointer", ["pointer"], l), d = Fo(t, e, o._on_thread_state_transition_complete); o._performData = d, r.writePointer(d), o.backtrace = (f, u) => { let _ = i(f, u), h = new Hn(_); return Script.bindWeak(h, p.bind(null, _)), h }; function p(f) { s(f) } return o.getId = f => a(f).readUtf8String(), o.getFrames = f => JSON.parse(c(f).readUtf8String()), o
} function sr() { Pt.forEach(t => { t.vtablePtr.writePointer(t.vtable), t.vtableCountPtr.writeS32(t.vtableCount) }), Pt.clear(); for (let t of jo.splice(0)) t.deactivate(); for (let t of Xn.splice(0)) t.revert() } function ar(t) { return Ro(t, "art::jni::JniIdManager::DecodeMethodId") } function wo(t) { return Ro(t, "art::jni::JniIdManager::DecodeFieldId") } function Ro(t, e) { let n = G(), r = No(n).offset, o = r.jniIdManager, i = r.jniIdsIndirection; if (o !== null && i !== null) { let s = n.artRuntime; if (s.add(i).readInt() !== ul) { let a = s.add(o).readPointer(); return n[e](a, t) } } return t } function zc(t, e, n, r, o) { let i = Ye(o).offset, s = be(o).offset, l; return Memory.patchCode(t, 128, a => { let c = new X86Writer(a, { pc: t }), d = new X86Relocator(e, c), p = [15, 174, 4, 36], f = [15, 174, 12, 36]; c.putPushax(), c.putMovRegReg("ebp", "esp"), c.putAndRegU32("esp", 4294967280), c.putSubRegImm("esp", 512), c.putBytes(p), c.putMovRegFsU32Ptr("ebx", i.self), c.putCallAddressWithAlignedArguments(se.replacedMethods.findReplacementFromQuickCode, ["eax", "ebx"]), c.putTestRegReg("eax", "eax"), c.putJccShortLabel("je", "restore_registers", "no-hint"), c.putMovRegOffsetPtrReg("ebp", 7 * 4, "eax"), c.putLabel("restore_registers"), c.putBytes(f), c.putMovRegReg("esp", "ebp"), c.putPopax(), c.putJccShortLabel("jne", "invoke_replacement", "no-hint"); do l = d.readOne(); while (l < n && !d.eoi); d.writeAll(), d.eoi || c.putJmpAddress(e.add(l)), c.putLabel("invoke_replacement"), c.putJmpRegOffsetPtr("eax", s.quickCode), c.flush() }), l } function Vc(t, e, n, r, o) { let i = Ye(o).offset, s = be(o).offset, l; return Memory.patchCode(t, 256, a => { let c = new X86Writer(a, { pc: t }), d = new X86Relocator(e, c), p = [15, 174, 4, 36], f = [15, 174, 12, 36]; c.putPushax(), c.putMovRegReg("rbp", "rsp"), c.putAndRegU32("rsp", 4294967280), c.putSubRegImm("rsp", 512), c.putBytes(p), c.putMovRegGsU32Ptr("rbx", i.self), c.putCallAddressWithAlignedArguments(se.replacedMethods.findReplacementFromQuickCode, ["rdi", "rbx"]), c.putTestRegReg("rax", "rax"), c.putJccShortLabel("je", "restore_registers", "no-hint"), c.putMovRegOffsetPtrReg("rbp", 8 * 8, "rax"), c.putLabel("restore_registers"), c.putBytes(f), c.putMovRegReg("rsp", "rbp"), c.putPopax(), c.putJccShortLabel("jne", "invoke_replacement", "no-hint"); do l = d.readOne(); while (l < n && !d.eoi); d.writeAll(), d.eoi || c.putJmpAddress(e.add(l)), c.putLabel("invoke_replacement"), c.putJmpRegOffsetPtr("rdi", s.quickCode), c.flush() }), l } function Jc(t, e, n, r, o) { let i = be(o).offset, s = e.and(Qn), l; return Memory.patchCode(t, 128, a => { let c = new ThumbWriter(a, { pc: t }), d = new ThumbRelocator(s, c), p = [45, 237, 16, 10], f = [189, 236, 16, 10]; c.putPushRegs(["r1", "r2", "r3", "r5", "r6", "r7", "r8", "r10", "r11", "lr"]), c.putBytes(p), c.putSubRegRegImm("sp", "sp", 8), c.putStrRegRegOffset("r0", "sp", 0), c.putCallAddressWithArguments(se.replacedMethods.findReplacementFromQuickCode, ["r0", "r9"]), c.putCmpRegImm("r0", 0), c.putBCondLabel("eq", "restore_registers"), c.putStrRegRegOffset("r0", "sp", 0), c.putLabel("restore_registers"), c.putLdrRegRegOffset("r0", "sp", 0), c.putAddRegRegImm("sp", "sp", 8), c.putBytes(f), c.putPopRegs(["lr", "r11", "r10", "r8", "r7", "r6", "r5", "r3", "r2", "r1"]), c.putBCondLabel("ne", "invoke_replacement"); do l = d.readOne(); while (l < n && !d.eoi); d.writeAll(), d.eoi || c.putLdrRegAddress("pc", e.add(l)), c.putLabel("invoke_replacement"), c.putLdrRegRegOffset("pc", "r0", i.quickCode), c.flush() }), l } function Gc(t, e, n, { availableScratchRegs: r }, o) { let i = be(o).offset, s; return Memory.patchCode(t, 256, l => { let a = new Arm64Writer(l, { pc: t }), c = new Arm64Relocator(e, a); a.putPushRegReg("d0", "d1"), a.putPushRegReg("d2", "d3"), a.putPushRegReg("d4", "d5"), a.putPushRegReg("d6", "d7"), a.putPushRegReg("x1", "x2"), a.putPushRegReg("x3", "x4"), a.putPushRegReg("x5", "x6"), a.putPushRegReg("x7", "x20"), a.putPushRegReg("x21", "x22"), a.putPushRegReg("x23", "x24"), a.putPushRegReg("x25", "x26"), a.putPushRegReg("x27", "x28"), a.putPushRegReg("x29", "lr"), a.putSubRegRegImm("sp", "sp", 16), a.putStrRegRegOffset("x0", "sp", 0), a.putCallAddressWithArguments(se.replacedMethods.findReplacementFromQuickCode, ["x0", "x19"]), a.putCmpRegReg("x0", "xzr"), a.putBCondLabel("eq", "restore_registers"), a.putStrRegRegOffset("x0", "sp", 0), a.putLabel("restore_registers"), a.putLdrRegRegOffset("x0", "sp", 0), a.putAddRegRegImm("sp", "sp", 16), a.putPopRegReg("x29", "lr"), a.putPopRegReg("x27", "x28"), a.putPopRegReg("x25", "x26"), a.putPopRegReg("x23", "x24"), a.putPopRegReg("x21", "x22"), a.putPopRegReg("x7", "x20"), a.putPopRegReg("x5", "x6"), a.putPopRegReg("x3", "x4"), a.putPopRegReg("x1", "x2"), a.putPopRegReg("d6", "d7"), a.putPopRegReg("d4", "d5"), a.putPopRegReg("d2", "d3"), a.putPopRegReg("d0", "d1"), a.putBCondLabel("ne", "invoke_replacement"); do s = c.readOne(); while (s < n && !c.eoi); if (c.writeAll(), !c.eoi) { let d = Array.from(r)[0]; a.putLdrRegAddress(d, e.add(s)), a.putBrReg(d) } a.putLabel("invoke_replacement"), a.putLdrRegRegOffset("x16", "x0", i.quickCode), a.putBrReg("x16"), a.flush() }), s } function Io(t, e, n) { Memory.patchCode(t, 16, r => { let o = new X86Writer(r, { pc: t }); o.putJmpAddress(e), o.flush() }) } function Hc(t, e, n) { let r = t.and(Qn); Memory.patchCode(r, 16, o => { let i = new ThumbWriter(o, { pc: r }); i.putLdrRegAddress("pc", e.or(1)), i.flush() }) } function Zc(t, e, n) { Memory.patchCode(t, 16, r => { let o = new Arm64Writer(r, { pc: t }); n === 16 ? o.putLdrRegAddress("x16", e) : o.putAdrpRegAddress("x16", e), o.putBrReg("x16"), o.flush() }) } function Wc(t) { let e = G(), { module: n, artClassLinker: r } = e; return t.equals(r.quickGenericJniTrampoline) || t.equals(r.quickToInterpreterBridgeTrampoline) || t.equals(r.quickResolutionTrampoline) || t.equals(r.quickImtConflictTrampoline) || t.compare(n.base) >= 0 && t.compare(n.base.add(n.size)) < 0 } function Kc() { return ne() < 28 } function Co(t, e) { let r = be(e).offset; return ["jniCode", "accessFlags", "quickCode", "interpreterCode"].reduce((o, i) => { let s = r[i]; if (s === void 0) return o; let l = t.add(s), a = i === "accessFlags" ? Qa : Ya; return o[i] = a.call(l), o }, {}) } function jt(t, e, n) { let o = be(n).offset; Object.keys(e).forEach(i => { let s = o[i]; if (s === void 0) return; let l = t.add(s); (i === "accessFlags" ? Xa : el).call(l, e[i]) }) } function Qc(t) { if (Process.arch !== "ia32") return ho; let e = t.add(Sl).readPointer().readCString(); if (e === null || e.length === 0 || e.length > 65535) return ho; let n; switch (e[0]) { case "V": n = Il; break; case "F": n = Cl; break; case "D": n = Tl; break; case "J": n = Al; break; case "Z": case "B": n = kl; break; case "C": n = Nl; break; case "S": n = Ll; break; default: n = xl; break }let r = 0; for (let o = e.length - 1; o > 0; o--) { let i = e[o]; r += i === "D" || i === "J" ? 2 : 1 } return n << Ml | r } function Yc(t, e) { let n = G(); if (ne() < 23) { let r = n["art::Thread::CurrentFromGdb"](); return n["art::mirror::Object::Clone"](t, r) } return Memory.dup(t, be(e).size) } function lr(t, e, n) { Po(t, e, zn, n) } function cr(t, e) { Po(t, e, Bn) } function dr(t, e) { let n = G(); if (ne() < 26) throw new Error("This API is only available on Android >= 8.0"); Se(t, e, r => { n["art::Runtime::DeoptimizeBootImage"](n.artRuntime) }) } function Po(t, e, n, r) { let o = G(); if (ne() < 24) throw new Error("This API is only available on Android >= 7.0"); Se(t, e, i => { if (ne() < 30) { if (!o.isJdwpStarted()) { let l = Xc(o); zl.push(l) } o.isDebuggerActive() || o["art::Dbg::GoActive"](); let s = Memory.alloc(8 + v); switch (s.writeU32(n), n) { case Bn: break; case zn: s.add(8).writePointer(r); break; default: throw new Error("Unsupported deoptimization kind") }o["art::Dbg::RequestDeoptimization"](s), o["art::Dbg::ManageDeoptimization"]() } else { let s = o.artInstrumentation; if (s === null) throw new Error("Unable to find Instrumentation class in ART; please file a bug"); let l = o["art::Instrumentation::EnableDeoptimization"]; switch (l !== void 0 && (s.add(Pl().offset.deoptimizationEnabled).readU8() || l(s)), n) { case Bn: o["art::Instrumentation::DeoptimizeEverything"](s, Memory.allocUtf8String("frida")); break; case zn: o["art::Instrumentation::Deoptimize"](s, r); break; default: throw new Error("Unsupported deoptimization kind") } } }) } function Xc(t) { let e = new Wn; t["art::Dbg::SetJdwpAllowed"](1); let n = ed(); t["art::Dbg::ConfigureJdwp"](n); let r = t["art::InternalDebuggerControlCallback::StartDebugger"]; return r !== void 0 ? r(NULL) : t["art::Dbg::StartJdwp"](), e } function ed() { let t = ne() < 28 ? 2 : 3, e = 0, n = t, r = !0, o = !1, i = e, s = 8 + ft + 2, l = Memory.alloc(s); return l.writeU32(n).add(4).writeU8(r ? 1 : 0).add(1).writeU8(o ? 1 : 0).add(1).add(ft).writeU16(i), l } function To() { Rn === null && (Rn = new NativeFunction(Process.getModuleByName("libc.so").getExportByName("socketpair"), "int", ["int", "int", "int", "pointer"])); let t = Memory.alloc(8); if (Rn(Ol, Rl, 0, t) === -1) throw new Error("Unable to create socketpair for JDWP"); return [t.readS32(), t.add(4).readS32()] } function td(t) { let e = $l().offset, n = t.vm.add(e.globalsLock), r = t.vm.add(e.globals), o = t["art::IndirectReferenceTable::Add"], i = t["art::ReaderWriterMutex::ExclusiveLock"], s = t["art::ReaderWriterMutex::ExclusiveUnlock"], l = 0; return function (a, c, d) { i(n, c); try { return o(r, l, d) } finally { s(n, c) } } } function nd(t) { let e = t["art::Thread::DecodeJObject"]; if (e === void 0) throw new Error("art::Thread::DecodeJObject is not available; please file a bug"); return function (n, r, o) { return e(r, o) } } function Fo(t, e, n) { let r = G(), o = e.handle.readPointer(), i, s = r.find("_ZN3art3JNIILb1EE14ExceptionClearEP7_JNIEnv"); s !== null ? i = s : i = o.add(Vt).readPointer(); let l, a = r.find("_ZN3art3JNIILb1EE10FatalErrorEP7_JNIEnvPKc"); a !== null ? l = a : l = o.add(hl).readPointer(); let c = rd[Process.arch]; if (c === void 0) throw new Error("Not yet implemented for " + Process.arch); let d = null, p = Ye(t).offset, f = p.exception, u = new Set, _ = p.isExceptionReportedToInstrumentation; _ !== null && u.add(_); let h = p.throwLocation; h !== null && (u.add(h), u.add(h + v), u.add(h + 2 * v)); let g = 65536, b = Memory.alloc(g); return Memory.patchCode(b, g, E => { d = c(E, b, i, l, f, u, n) }), d._code = b, d._callback = n, d } function Ao(t, e, n, r, o, i, s) { let l = {}, a = new Set, c = [n]; for (; c.length > 0;) { let h = c.shift(); if (Object.values(l).some(({ begin: M, end: O }) => h.compare(M) >= 0 && h.compare(O) < 0)) continue; let b = h.toString(), E = { begin: h }, C = null, A = !1; do { if (h.equals(r)) { A = !0; break } let M = Instruction.parse(h); C = M; let O = l[M.address.toString()]; if (O !== void 0) { delete l[O.begin.toString()], l[b] = O, O.begin = E.begin, E = null; break } let k = null; switch (M.mnemonic) { case "jmp": k = ptr(M.operands[0].value), A = !0; break; case "je": case "jg": case "jle": case "jne": case "js": k = ptr(M.operands[0].value); break; case "ret": A = !0; break }k !== null && (a.add(k.toString()), c.push(k), c.sort((N, S) => N.compare(S))), h = M.next } while (!A); E !== null && (E.end = C.address.add(C.size), l[b] = E) } let d = Object.keys(l).map(h => l[h]); d.sort((h, g) => h.begin.compare(g.begin)); let p = l[n.toString()]; d.splice(d.indexOf(p), 1), d.unshift(p); let f = new X86Writer(t, { pc: e }), u = !1, _ = null; return d.forEach(h => { let g = h.end.sub(h.begin).toInt32(), b = new X86Relocator(h.begin, f), E; for (; (E = b.readOne()) !== 0;) { let C = b.input, { mnemonic: A } = C, M = C.address.toString(); a.has(M) && f.putLabel(M); let O = !0; switch (A) { case "jmp": f.putJmpNearLabel(me(C.operands[0])), O = !1; break; case "je": case "jg": case "jle": case "jne": case "js": f.putJccNearLabel(A, me(C.operands[0]), "no-hint"), O = !1; break; case "mov": { let [k, N] = C.operands; if (k.type === "mem" && N.type === "imm") { let S = k.value, x = S.disp; if (x === o && N.value.valueOf() === 0) { if (_ = S.base, f.putPushfx(), f.putPushax(), f.putMovRegReg("xbp", "xsp"), v === 4) f.putAndRegU32("esp", 4294967280); else { let j = _ !== "rdi" ? "rdi" : "rsi"; f.putMovRegU64(j, uint64("0xfffffffffffffff0")), f.putAndRegReg("rsp", j) } f.putCallAddressWithAlignedArguments(s, [_]), f.putMovRegReg("xsp", "xbp"), f.putPopax(), f.putPopfx(), u = !0, O = !1 } else i.has(x) && S.base === _ && (O = !1) } break } case "call": { let k = C.operands[0]; k.type === "mem" && k.value.disp === Vt && (v === 4 ? (f.putPopReg("eax"), f.putMovRegRegOffsetPtr("eax", "eax", 4), f.putPushReg("eax")) : f.putMovRegRegOffsetPtr("rdi", "rdi", 8), f.putCallAddressWithArguments(s, []), u = !0, O = !1); break } }if (O ? b.writeAll() : b.skipOne(), E === g) break } b.dispose() }), f.dispose(), u || ur(), new NativeFunction(e, "void", ["pointer"], K) } function od(t, e, n, r, o, i, s) { let l = {}, a = new Set, c = ptr(1).not(), d = [n]; for (; d.length > 0;) { let b = d.shift(); if (Object.values(l).some(({ begin: x, end: j }) => b.compare(x) >= 0 && b.compare(j) < 0)) continue; let C = b.and(c), A = C.toString(), M = b.and(1), O = { begin: C }, k = null, N = !1, S = 0; do { if (b.equals(r)) { N = !0; break } let x = Instruction.parse(b), { mnemonic: j } = x; k = x; let R = b.and(c).toString(), D = l[R]; if (D !== void 0) { delete l[D.begin.toString()], l[A] = D, D.begin = O.begin, O = null; break } let B = S === 0, F = null; switch (j) { case "b": F = ptr(x.operands[0].value), N = B; break; case "beq.w": case "beq": case "bne": case "bne.w": case "bgt": F = ptr(x.operands[0].value); break; case "cbz": case "cbnz": F = ptr(x.operands[1].value); break; case "pop.w": B && (N = x.operands.filter(V => V.value === "pc").length === 1); break }switch (j) { case "it": S = 1; break; case "itt": S = 2; break; case "ittt": S = 3; break; case "itttt": S = 4; break; default: S > 0 && S--; break }F !== null && (a.add(F.toString()), d.push(F.or(M)), d.sort((V, ee) => V.compare(ee))), b = x.next } while (!N); O !== null && (O.end = k.address.add(k.size), l[A] = O) } let p = Object.keys(l).map(b => l[b]); p.sort((b, E) => b.begin.compare(E.begin)); let f = l[n.and(c).toString()]; p.splice(p.indexOf(f), 1), p.unshift(f); let u = new ThumbWriter(t, { pc: e }), _ = !1, h = null, g = null; return p.forEach(b => { let E = new ThumbRelocator(b.begin, u), C = b.begin, A = b.end, M = 0; do { if (E.readOne() === 0) throw new Error("Unexpected end of block"); let k = E.input; C = k.address, M = k.size; let { mnemonic: N } = k, S = C.toString(); a.has(S) && u.putLabel(S); let x = !0; switch (N) { case "b": u.putBLabel(me(k.operands[0])), x = !1; break; case "beq.w": u.putBCondLabelWide("eq", me(k.operands[0])), x = !1; break; case "bne.w": u.putBCondLabelWide("ne", me(k.operands[0])), x = !1; break; case "beq": case "bne": case "bgt": u.putBCondLabelWide(N.substr(1), me(k.operands[0])), x = !1; break; case "cbz": { let j = k.operands; u.putCbzRegLabel(j[0].value, me(j[1])), x = !1; break } case "cbnz": { let j = k.operands; u.putCbnzRegLabel(j[0].value, me(j[1])), x = !1; break } case "str": case "str.w": { let j = k.operands[1].value, w = j.disp; if (w === o) { h = j.base; let R = h !== "r4" ? "r4" : "r5", D = ["r0", "r1", "r2", "r3", R, "r9", "r12", "lr"]; u.putPushRegs(D), u.putMrsRegReg(R, "apsr-nzcvq"), u.putCallAddressWithArguments(s, [h]), u.putMsrRegReg("apsr-nzcvq", R), u.putPopRegs(D), _ = !0, x = !1 } else i.has(w) && j.base === h && (x = !1); break } case "ldr": { let [j, w] = k.operands; if (w.type === "mem") { let R = w.value; R.base[0] === "r" && R.disp === Vt && (g = j.value) } break } case "blx": k.operands[0].value === g && (u.putLdrRegRegOffset("r0", "r0", 4), u.putCallAddressWithArguments(s, ["r0"]), _ = !0, g = null, x = !1); break }x ? E.writeAll() : E.skipOne() } while (!C.add(M).equals(A)); E.dispose() }), u.dispose(), _ || ur(), new NativeFunction(e.or(1), "void", ["pointer"], K) } function id(t, e, n, r, o, i, s) { let l = {}, a = new Set, c = [n]; for (; c.length > 0;) { let b = c.shift(); if (Object.values(l).some(({ begin: k, end: N }) => b.compare(k) >= 0 && b.compare(N) < 0)) continue; let C = b.toString(), A = { begin: b }, M = null, O = !1; do { if (b.equals(r)) { O = !0; break } let k; try { k = Instruction.parse(b) } catch (x) { if (b.readU32() === 0) { O = !0; break } else throw x } M = k; let N = l[k.address.toString()]; if (N !== void 0) { delete l[N.begin.toString()], l[C] = N, N.begin = A.begin, A = null; break } let S = null; switch (k.mnemonic) { case "b": S = ptr(k.operands[0].value), O = !0; break; case "b.eq": case "b.ne": case "b.le": case "b.gt": S = ptr(k.operands[0].value); break; case "cbz": case "cbnz": S = ptr(k.operands[1].value); break; case "tbz": case "tbnz": S = ptr(k.operands[2].value); break; case "ret": O = !0; break }S !== null && (a.add(S.toString()), c.push(S), c.sort((x, j) => x.compare(j))), b = k.next } while (!O); A !== null && (A.end = M.address.add(M.size), l[C] = A) } let d = Object.keys(l).map(b => l[b]); d.sort((b, E) => b.begin.compare(E.begin)); let p = l[n.toString()]; d.splice(d.indexOf(p), 1), d.unshift(p); let f = new Arm64Writer(t, { pc: e }); f.putBLabel("performTransition"); let u = e.add(f.offset); f.putPushAllXRegisters(), f.putCallAddressWithArguments(s, ["x0"]), f.putPopAllXRegisters(), f.putRet(), f.putLabel("performTransition"); let _ = !1, h = null, g = null; return d.forEach(b => { let E = b.end.sub(b.begin).toInt32(), C = new Arm64Relocator(b.begin, f), A; for (; (A = C.readOne()) !== 0;) { let M = C.input, { mnemonic: O } = M, k = M.address.toString(); a.has(k) && f.putLabel(k); let N = !0; switch (O) { case "b": f.putBLabel(me(M.operands[0])), N = !1; break; case "b.eq": case "b.ne": case "b.le": case "b.gt": f.putBCondLabel(O.substr(2), me(M.operands[0])), N = !1; break; case "cbz": { let S = M.operands; f.putCbzRegLabel(S[0].value, me(S[1])), N = !1; break } case "cbnz": { let S = M.operands; f.putCbnzRegLabel(S[0].value, me(S[1])), N = !1; break } case "tbz": { let S = M.operands; f.putTbzRegImmLabel(S[0].value, S[1].value.valueOf(), me(S[2])), N = !1; break } case "tbnz": { let S = M.operands; f.putTbnzRegImmLabel(S[0].value, S[1].value.valueOf(), me(S[2])), N = !1; break } case "str": { let S = M.operands, x = S[0].value, j = S[1].value, w = j.disp; x === "xzr" && w === o ? (h = j.base, f.putPushRegReg("x0", "lr"), f.putMovRegReg("x0", h), f.putBlImm(u), f.putPopRegReg("x0", "lr"), _ = !0, N = !1) : i.has(w) && j.base === h && (N = !1); break } case "ldr": { let S = M.operands, x = S[1].value; x.base[0] === "x" && x.disp === Vt && (g = S[0].value); break } case "blr": M.operands[0].value === g && (f.putLdrRegRegOffset("x0", "x0", 8), f.putCallAddressWithArguments(s, ["x0"]), _ = !0, g = null, N = !1); break }if (N ? C.writeAll() : C.skipOne(), A === E) break } C.dispose() }), f.dispose(), _ || ur(), new NativeFunction(e, "void", ["pointer"], K) } function ur() { throw new Error("Unable to parse ART internals; please file a bug") } function sd(t) { let e = t["art::ArtMethod::PrettyMethod"]; e !== void 0 && (Interceptor.attach(e.impl, se.hooks.ArtMethod.prettyMethod), Interceptor.flush()) } function me(t) { return ptr(t.value).toString() } function ad(t, e) { return new NativeFunction(t, "pointer", e, K) } function ld(t, e) { let n = new NativeFunction(t, "void", ["pointer"].concat(e), K); return function () { let r = Memory.alloc(v); return n(r, ...arguments), r.readPointer() } } function Ot(t, e) { let { arch: n } = Process; switch (n) { case "ia32": case "arm64": { let r; n === "ia32" ? r = Qe(64, s => { let l = 1 + e.length, a = l * 4; s.putSubRegImm("esp", a); for (let c = 0; c !== l; c++) { let d = c * 4; s.putMovRegRegOffsetPtr("eax", "esp", a + 4 + d), s.putMovRegOffsetPtrReg("esp", d, "eax") } s.putCallAddress(t), s.putAddRegImm("esp", a - 4), s.putRet() }) : r = Qe(32, s => { s.putMovRegReg("x8", "x0"), e.forEach((l, a) => { s.putMovRegReg("x" + a, "x" + (a + 1)) }), s.putLdrRegAddress("x7", t), s.putBrReg("x7") }); let o = new NativeFunction(r, "void", ["pointer"].concat(e), K), i = function (...s) { o(...s) }; return i.handle = r, i.impl = t, i } default: { let r = new NativeFunction(t, "void", ["pointer"].concat(e), K); return r.impl = t, r } } } function pr(t, e) { return (pd[Process.arch] || fd)(t, e) } function fd(t, e) { return new NativeCallback(n => { n.readS32() === t && e(n) }, "void", ["pointer", "pointer"]) } function hd(t) { let e = t % v; return e !== 0 ? t + v - e : t } var Ka, v, Qa, Ya, Xa, el, tl, nl, rl, Rt, ol, il, xo, sl, al, po, ll, cl, dl, ul, Bn, zn, Qn, pl, fl, Vt, hl, Lo, _l, ml, gl, kn, fo, bl, yl, El, vl, Sl, wl, Il, Cl, Tl, Al, xl, Ll, Nl, kl, ho, Ml, ft, jl, Ol, Rl, No, Pl, be, Ye, Fl, Dl, mt, ko, ne, Yn, Ul, Bl, K, dt, Mn, jn, Mo, se, Xn, Pt, jo, On, _o, mo, go, ut, zl, Rn, Mt, Zl, Ql, tc, dc, Fn, gc, Vn, Jn, Ec, Gn, Ft, wc, $n, Mc, Dt, Hn, Bc, $c, qc, Ut, Zn, qn, Wn, rd, Bt, Kn, ht, cd, Do, Uo, dd, zt, Bo, zo, ud, _t, pt, pd, gt = te(() => { U(); ao(); pn(); fn(); hn(); We(); kt(); Ka = 4, v = Process.pointerSize, { readU32: Qa, readPointer: Ya, writeU32: Xa, writePointer: el } = NativePointer.prototype, tl = 1, nl = 8, rl = 16, Rt = 256, ol = 524288, il = 2097152, xo = 1073741824, sl = 524288, al = 134217728, po = 1048576, ll = 2097152, cl = 268435456, dl = 268435456, ul = 0, Bn = 3, zn = 5, Qn = ptr(1).not(), pl = 2147467263, fl = 4294963200, Vt = 17 * v, hl = 18 * v, Lo = 12, _l = 112, ml = 116, gl = 0, kn = 56, fo = 4, bl = 8, yl = 10, El = 12, vl = 14, Sl = 28, wl = 36, Il = 0, Cl = 1, Tl = 2, Al = 3, xl = 4, Ll = 5, Nl = 6, kl = 7, ho = 2147483648, Ml = 28, ft = 3 * v, jl = 3 * v, Ol = 1, Rl = 1, No = ue(Hl), Pl = ue(ic), be = ue(ac), Ye = ue(lc), Fl = ue(cc), Dl = ue(bc), mt = ue(fc), ko = ue(hc), ne = ue(_c), Yn = ue(mc), Ul = ue(Sc), Bl = Process.arch === "ia32" ? ld : ad, K = { exceptions: "propagate" }, dt = {}, Mn = null, jn = null, Mo = null, se = null, Xn = [], Pt = new Map, jo = [], On = null, _o = 0, mo = !1, go = !1, ut = null, zl = [], Rn = null, Mt = null; Zl = { ia32: bo, x64: bo, arm: Wl, arm64: Kl }; Ql = { ia32: yo, x64: yo, arm: Xl, arm64: ec }; tc = { ia32: Eo, x64: Eo, arm: rc, arm64: oc }; dc = { ia32: vo, x64: vo, arm: uc, arm64: pc }; Fn = null, gc = 92; Vn = class { constructor(e) { let n = Memory.alloc(4 * v), r = n.add(v); n.writePointer(r); let o = new NativeCallback((i, s) => e(s) === !0 ? 1 : 0, "bool", ["pointer", "pointer"]); r.add(2 * v).writePointer(o), this.handle = n, this._onVisit = o } }; Jn = class { constructor(e) { let n = Memory.alloc(4 * v), r = n.add(v); n.writePointer(r); let o = new NativeCallback((i, s) => { e(s) }, "void", ["pointer", "pointer"]); r.add(2 * v).writePointer(o), this.handle = n, this._onVisit = o } }; Ec = { "include-inlined-frames": 0, "skip-inlined-frames": 1 }, Gn = class { constructor(e, n, r, o = 0, i = !0) { let s = G(), l = 512, a = 3 * v, c = Memory.alloc(l + a); s["art::StackVisitor::StackVisitor"](c, e, n, Ec[r], o, i ? 1 : 0); let d = c.add(l); c.writePointer(d); let p = new NativeCallback(this._visitFrame.bind(this), "bool", ["pointer"]); d.add(2 * v).writePointer(p), this.handle = c, this._onVisitFrame = p; let f = c.add(v === 4 ? 12 : 24); this._curShadowFrame = f, this._curQuickFrame = f.add(v), this._curQuickFramePc = f.add(2 * v), this._curOatQuickMethodHeader = f.add(3 * v), this._getMethodImpl = s["art::StackVisitor::GetMethod"], this._descLocImpl = s["art::StackVisitor::DescribeLocation"], this._getCQFIImpl = s["art::StackVisitor::GetCurrentQuickFrameInfo"] } walkStack(e = !1) { G()["art::StackVisitor::WalkStack"](this.handle, e ? 1 : 0) } _visitFrame() { return this.visitFrame() ? 1 : 0 } visitFrame() { throw new Error("Subclass must implement visitFrame") } getMethod() { let e = this._getMethodImpl(this.handle); return e.isNull() ? null : new Ft(e) } getCurrentQuickFramePc() { return this._curQuickFramePc.readPointer() } getCurrentQuickFrame() { return this._curQuickFrame.readPointer() } getCurrentShadowFrame() { return this._curShadowFrame.readPointer() } describeLocation() { let e = new Bt; return this._descLocImpl(e, this.handle), e.disposeToString() } getCurrentOatQuickMethodHeader() { return this._curOatQuickMethodHeader.readPointer() } getCurrentQuickFrameInfo() { return this._getCQFIImpl(this.handle) } }, Ft = class { constructor(e) { this.handle = e } prettyMethod(e = !0) { let n = new Bt; return G()["art::ArtMethod::PrettyMethod"](n, this.handle, e ? 1 : 0), n.disposeToString() } toString() { return `ArtMethod(handle=${this.handle})` } }; wc = { ia32: globalThis.X86Relocator, x64: globalThis.X86Relocator, arm: globalThis.ThumbRelocator, arm64: globalThis.Arm64Relocator }, $n = { ia32: globalThis.X86Writer, x64: globalThis.X86Writer, arm: globalThis.ThumbWriter, arm64: globalThis.Arm64Writer }; Mc = { arm: { signatures: [{ pattern: ["b0 68", "01 30", "0c d0", "1b 98", ":", "c0 ff", "c0 ff", "00 ff", "00 2f"], validateMatch: Dn }, { pattern: ["d8 f8 08 00", "01 30", "0c d0", "1b 98", ":", "f0 ff ff 0f", "ff ff", "00 ff", "00 2f"], validateMatch: Dn }, { pattern: ["b0 68", "01 30", "40 f0 c3 80", "00 25", ":", "c0 ff", "c0 ff", "c0 fb 00 d0", "ff f8"], validateMatch: Dn }], instrument: Rc }, arm64: { signatures: [{ pattern: ["0a 40 b9", "1f 05 00 31", "40 01 00 54", "88 39 00 f0", ":", "fc ff ff", "1f fc ff ff", "1f 00 00 ff", "00 00 00 9f"], offset: 1, validateMatch: Un }, { pattern: ["0a 40 b9", "1f 05 00 31", "40 01 00 54", "00 0e 40 f9", ":", "fc ff ff", "1f fc ff ff", "1f 00 00 ff", "00 fc ff ff"], offset: 1, validateMatch: Un }, { pattern: ["0a 40 b9", "1f 05 00 31", "01 34 00 54", "e0 03 1f aa", ":", "fc ff ff", "1f fc ff ff", "1f 00 00 ff", "e0 ff ff ff"], offset: 1, validateMatch: Un }], instrument: Pc } }; Dt = class { constructor(e, n, r) { this.address = e, this.size = n, this.originalCode = e.readByteArray(n), this.trampoline = r } revert() { Memory.patchCode(this.address, this.size, e => { e.writeByteArray(this.originalCode) }) } }; Hn = class { constructor(e) { this.handle = e } get id() { return ut.getId(this.handle) } get frames() { return ut.getFrames(this.handle) } }; Bc = { ia32: zc, x64: Vc, arm: Jc, arm64: Gc }; $c = { ia32: Io, x64: Io, arm: Hc, arm64: Zc }; qc = { ia32: 5, x64: 16, arm: 8, arm64: 16 }, Ut = class { constructor(e) { this.quickCode = e, this.quickCodeAddress = Process.arch === "arm" ? e.and(Qn) : e, this.redirectSize = 0, this.trampoline = null, this.overwrittenPrologue = null, this.overwrittenPrologueLength = 0 } _canRelocateCode(e, n) { let r = $n[Process.arch], o = wc[Process.arch], { quickCodeAddress: i } = this, s = new r(i), l = new o(i, s), a; if (Process.arch === "arm64") { let c = new Set(["x16", "x17"]); do { let d = l.readOne(), p = new Set(c), { read: f, written: u } = l.input.regsAccessed; for (let _ of [f, u]) for (let h of _) { let g; h.startsWith("w") ? g = "x" + h.substring(1) : g = h, p.delete(g) } if (p.size === 0) break; a = d, c = p } while (a < e && !l.eoi); n.availableScratchRegs = c } else do a = l.readOne(); while (a < e && !l.eoi); return a >= e } _allocateTrampoline() { Mt === null && (Mt = un(v === 4 ? 128 : 256)); let e = qc[Process.arch], n, r, o = 1, i = {}; if (v === 4 || this._canRelocateCode(e, i)) n = e, r = {}; else { let s; Process.arch === "x64" ? (n = 5, s = pl) : Process.arch === "arm64" && (n = 8, s = fl, o = 4096), r = { near: this.quickCodeAddress, maxDistance: s } } return this.redirectSize = n, this.trampoline = Mt.allocateSlice(r, o), i } _destroyTrampoline() { Mt.freeSlice(this.trampoline) } activate(e) { let n = this._allocateTrampoline(), { trampoline: r, quickCode: o, redirectSize: i } = this, s = Bc[Process.arch], l = s(r, o, i, n, e); this.overwrittenPrologueLength = l, this.overwrittenPrologue = Memory.dup(this.quickCodeAddress, l); let a = $c[Process.arch]; a(o, r, i) } deactivate() { let { quickCodeAddress: e, overwrittenPrologueLength: n } = this, r = $n[Process.arch]; Memory.patchCode(e, n, o => { let i = new r(o, { pc: e }), { overwrittenPrologue: s } = this; i.putBytes(s.readByteArray(n)), i.flush() }), this._destroyTrampoline() } }; Zn = class { constructor(e) { let n = ar(e); this.methodId = n, this.originalMethod = null, this.hookedMethodId = n, this.replacementMethodId = null, this.interceptor = null } replace(e, n, r, o, i) { let { kAccCompileDontBother: s, artNterpEntryPoint: l } = i; this.originalMethod = Co(this.methodId, o); let a = this.originalMethod.accessFlags; if ((a & dl) !== 0 && Kc()) { let u = this.originalMethod.jniCode; this.hookedMethodId = u.add(2 * v).readPointer(), this.originalMethod = Co(this.hookedMethodId, o) } let { hookedMethodId: c } = this, d = Yc(c, o); this.replacementMethodId = d, jt(d, { jniCode: e, accessFlags: (a & ~(il | ol | po) | Rt | s) >>> 0, quickCode: i.artClassLinker.quickGenericJniTrampoline, interpreterCode: i.artInterpreterToCompiledCodeBridge }, o); let p = xo | al | po; (a & Rt) === 0 && (p |= sl), jt(c, { accessFlags: (a & ~p | s) >>> 0 }, o); let f = this.originalMethod.quickCode; if (l !== null && f.equals(l) && jt(c, { quickCode: i.artQuickToInterpreterBridge }, o), !Wc(f)) { let u = new Ut(f); u.activate(o), this.interceptor = u } se.replacedMethods.set(c, d), Ic(c, o) } revert(e) { let { hookedMethodId: n, interceptor: r } = this; jt(n, this.originalMethod, e), se.replacedMethods.delete(n), r !== null && (r.deactivate(), this.interceptor = null) } resolveTarget(e, n, r, o) { return this.hookedMethodId } }; qn = class { constructor(e) { this.methodId = e, this.originalMethod = null } replace(e, n, r, o, i) { let { methodId: s } = this; this.originalMethod = Memory.dup(s, kn); let l = r.reduce((f, u) => f + u.size, 0); n && l++; let a = (s.add(fo).readU32() | Rt) >>> 0, c = l, d = 0, p = l; s.add(fo).writeU32(a), s.add(yl).writeU16(c), s.add(El).writeU16(d), s.add(vl).writeU16(p), s.add(wl).writeU32(Qc(s)), i.dvmUseJNIBridge(s, e) } revert(e) { Memory.copy(this.methodId, this.originalMethod, kn) } resolveTarget(e, n, r, o) { let i = r.handle.add(Lo).readPointer(), s; if (n) s = o.dvmDecodeIndirectRef(i, e.$h); else { let f = e.$borrowClassHandle(r); s = o.dvmDecodeIndirectRef(i, f.value), f.unref(r) } let l; n ? l = s.add(gl).readPointer() : l = s; let a = l.toString(16), c = Pt.get(a); if (c === void 0) { let f = l.add(ml), u = l.add(_l), _ = f.readPointer(), h = u.readS32(), g = h * v, b = Memory.alloc(2 * g); Memory.copy(b, _, g), f.writePointer(b), c = { classObject: l, vtablePtr: f, vtableCountPtr: u, vtable: _, vtableCount: h, shadowVtable: b, shadowVtableCount: h, targetMethods: new Map }, Pt.set(a, c) } let d = this.methodId.toString(16), p = c.targetMethods.get(d); if (p === void 0) { p = Memory.dup(this.originalMethod, kn); let f = c.shadowVtableCount++; c.shadowVtable.add(f * v).writePointer(p), p.add(bl).writeU16(f), c.vtableCountPtr.writeS32(c.shadowVtableCount), c.targetMethods.set(d, p) } return p } }; Wn = class { constructor() { let e = Process.getModuleByName("libart.so"), n = e.getExportByName("_ZN3art4JDWP12JdwpAdbState6AcceptEv"), r = e.getExportByName("_ZN3art4JDWP12JdwpAdbState15ReceiveClientFdEv"), o = To(), i = To(); this._controlFd = o[0], this._clientFd = i[0]; let s = null; s = Interceptor.attach(n, function (l) { let a = l[0]; Memory.scanSync(a.add(8252), 256, "00 ff ff ff ff 00")[0].address.add(1).writeS32(o[1]), s.detach() }), Interceptor.replace(r, new NativeCallback(function (l) { return Interceptor.revert(r), i[1] }, "int", ["pointer"])), Interceptor.flush(), this._handshakeRequest = this._performHandshake() } async _performHandshake() { let e = new UnixInputStream(this._clientFd, { autoClose: !1 }), n = new UnixOutputStream(this._clientFd, { autoClose: !1 }), r = [74, 68, 87, 80, 45, 72, 97, 110, 100, 115, 104, 97, 107, 101]; try { await n.writeAll(r), await e.readAll(r.length) } catch { } } }; rd = { ia32: Ao, x64: Ao, arm: od, arm64: id }; Bt = class { constructor() { this.handle = Memory.alloc(ft) } dispose() { let [e, n] = this._getData(); n || G().$delete(e) } disposeToString() { let e = this.toString(); return this.dispose(), e } toString() { let [e] = this._getData(); return e.readUtf8String() } _getData() { let e = this.handle, n = (e.readU8() & 1) === 0; return [n ? e.add(1) : e.add(2 * v).readPointer(), n] } }, Kn = class { $delete() { this.dispose(), G().$delete(this) } constructor(e, n) { this.handle = e, this._begin = e, this._end = e.add(v), this._storage = e.add(2 * v), this._elementSize = n } init() { this.begin = NULL, this.end = NULL, this.storage = NULL } dispose() { G().$delete(this.begin) } get begin() { return this._begin.readPointer() } set begin(e) { this._begin.writePointer(e) } get end() { return this._end.readPointer() } set end(e) { this._end.writePointer(e) } get storage() { return this._storage.readPointer() } set storage(e) { this._storage.writePointer(e) } get size() { return this.end.sub(this.begin).toInt32() / this._elementSize } }, ht = class t extends Kn { static $new() { let e = new t(G().$new(jl)); return e.init(), e } constructor(e) { super(e, v) } get handles() { let e = [], n = this.begin, r = this.end; for (; !n.equals(r);)e.push(n.readPointer()), n = n.add(v); return e } }, cd = 0, Do = v, Uo = Do + 4, dd = -1, zt = class t { $delete() { this.dispose(), G().$delete(this) } constructor(e) { this.handle = e, this._link = e.add(cd), this._numberOfReferences = e.add(Do) } init(e, n) { this.link = e, this.numberOfReferences = n } dispose() { } get link() { return new t(this._link.readPointer()) } set link(e) { this._link.writePointer(e) } get numberOfReferences() { return this._numberOfReferences.readS32() } set numberOfReferences(e) { this._numberOfReferences.writeS32(e) } }, Bo = hd(Uo), zo = Bo + v, ud = zo + v, _t = class t extends zt { static $new(e, n) { let r = new t(G().$new(ud)); return r.init(e, n), r } constructor(e) { super(e), this._self = e.add(Bo), this._currentScope = e.add(zo); let o = (64 - v - 4 - 4) / 4; this._scopeLayout = pt.layoutForCapacity(o), this._topHandleScopePtr = null } init(e, n) { let r = e.add(Ye(n).offset.topHandleScope); this._topHandleScopePtr = r, super.init(r.readPointer(), dd), this.self = e, this.currentScope = pt.$new(this._scopeLayout), r.writePointer(this) } dispose() { this._topHandleScopePtr.writePointer(this.link); let e; for (; (e = this.currentScope) !== null;) { let n = e.link; e.$delete(), this.currentScope = n } } get self() { return this._self.readPointer() } set self(e) { this._self.writePointer(e) } get currentScope() { let e = this._currentScope.readPointer(); return e.isNull() ? null : new pt(e, this._scopeLayout) } set currentScope(e) { this._currentScope.writePointer(e) } newHandle(e) { return this.currentScope.newHandle(e) } }, pt = class t extends zt { static $new(e) { let n = new t(G().$new(e.size), e); return n.init(), n } constructor(e, n) { super(e); let { offset: r } = n; this._refsStorage = e.add(r.refsStorage), this._pos = e.add(r.pos), this._layout = n } init() { super.init(NULL, this._layout.numberOfReferences), this.pos = 0 } get pos() { return this._pos.readU32() } set pos(e) { this._pos.writeU32(e) } newHandle(e) { let n = this.pos, r = this._refsStorage.add(n * 4); return r.writeS32(e.toInt32()), this.pos = n + 1, r } static layoutForCapacity(e) { let n = Uo, r = n + e * 4; return { size: r + 4, numberOfReferences: e, offset: { refsStorage: n, pos: r } } } }, pd = { arm: function (t, e) { let n = Process.pageSize, r = Memory.alloc(n); Memory.protect(r, n, "rwx"); let o = new NativeCallback(e, "void", ["pointer"]); r._onMatchCallback = o; let i = [26625, 18947, 17041, 53505, 19202, 18200, 18288, 48896], s = i.length * 2, l = s + 4, a = l + 4; return Memory.patchCode(r, a, function (c) { i.forEach((d, p) => { c.add(p * 2).writeU16(d) }), c.add(s).writeS32(t), c.add(l).writePointer(o) }), r.or(1) }, arm64: function (t, e) { let n = Process.pageSize, r = Memory.alloc(n); Memory.protect(r, n, "rwx"); let o = new NativeCallback(e, "void", ["pointer"]); r._onMatchCallback = o; let i = [3107979265, 402653378, 1795293247, 1409286241, 1476395139, 3592355936, 3596551104], s = i.length * 4, l = s + 4, a = l + 8; return Memory.patchCode(r, a, function (c) { i.forEach((d, p) => { c.add(p * 4).writeU32(d) }), c.add(s).writeS32(t), c.add(l).writePointer(o) }), r } } }); function xe() { return fr === null && (fr = Id()), fr } function Id() { let t = Process.enumerateModules().filter(a => /jvm.(dll|dylib|so)$/.test(a.name)); if (t.length === 0) return null; let e = t[0], n = { flavor: "jvm" }, r = Process.platform === "windows" ? [{ module: e, functions: { JNI_GetCreatedJavaVMs: ["JNI_GetCreatedJavaVMs", "int", ["pointer", "int", "pointer"]], JVM_Sleep: ["JVM_Sleep", "void", ["pointer", "pointer", "long"]], "VMThread::execute": ["VMThread::execute", "void", ["pointer"]], "Method::size": ["Method::size", "int", ["int"]], "Method::set_native_function": ["Method::set_native_function", "void", ["pointer", "pointer", "int"]], "Method::clear_native_function": ["Method::clear_native_function", "void", ["pointer"]], "Method::jmethod_id": ["Method::jmethod_id", "pointer", ["pointer"]], "ClassLoaderDataGraph::classes_do": ["ClassLoaderDataGraph::classes_do", "void", ["pointer"]], "NMethodSweeper::sweep_code_cache": ["NMethodSweeper::sweep_code_cache", "void", []], "OopMapCache::flush_obsolete_entries": ["OopMapCache::flush_obsolete_entries", "void", ["pointer"]] }, variables: { "VM_RedefineClasses::`vftable'": function (a) { this.vtableRedefineClasses = a }, "VM_RedefineClasses::doit": function (a) { this.redefineClassesDoIt = a }, "VM_RedefineClasses::doit_prologue": function (a) { this.redefineClassesDoItPrologue = a }, "VM_RedefineClasses::doit_epilogue": function (a) { this.redefineClassesDoItEpilogue = a }, "VM_RedefineClasses::allow_nested_vm_operations": function (a) { this.redefineClassesAllow = a }, "NMethodSweeper::_traversals": function (a) { this.traversals = a }, "NMethodSweeper::_should_sweep": function (a) { this.shouldSweep = a } }, optionals: [] }] : [{ module: e, functions: { JNI_GetCreatedJavaVMs: ["JNI_GetCreatedJavaVMs", "int", ["pointer", "int", "pointer"]], _ZN6Method4sizeEb: ["Method::size", "int", ["int"]], _ZN6Method19set_native_functionEPhb: ["Method::set_native_function", "void", ["pointer", "pointer", "int"]], _ZN6Method21clear_native_functionEv: ["Method::clear_native_function", "void", ["pointer"]], _ZN6Method24restore_unshareable_infoEP10JavaThread: ["Method::restore_unshareable_info", "void", ["pointer", "pointer"]], _ZN6Method24restore_unshareable_infoEP6Thread: ["Method::restore_unshareable_info", "void", ["pointer", "pointer"]], _ZN6Method11link_methodERK12methodHandleP10JavaThread: ["Method::link_method", "void", ["pointer", "pointer", "pointer"]], _ZN6Method10jmethod_idEv: ["Method::jmethod_id", "pointer", ["pointer"]], _ZN6Method10clear_codeEv: function (a) { let c = new NativeFunction(a, "void", ["pointer"], Ve); this["Method::clear_code"] = function (d) { c(d) } }, _ZN6Method10clear_codeEb: function (a) { let c = new NativeFunction(a, "void", ["pointer", "int"], Ve), d = 0; this["Method::clear_code"] = function (p) { c(p, d) } }, _ZN18VM_RedefineClasses19mark_dependent_codeEP13InstanceKlass: ["VM_RedefineClasses::mark_dependent_code", "void", ["pointer", "pointer"]], _ZN18VM_RedefineClasses20flush_dependent_codeEv: ["VM_RedefineClasses::flush_dependent_code", "void", []], _ZN18VM_RedefineClasses20flush_dependent_codeEP13InstanceKlassP6Thread: ["VM_RedefineClasses::flush_dependent_code", "void", ["pointer", "pointer", "pointer"]], _ZN18VM_RedefineClasses20flush_dependent_codeE19instanceKlassHandleP6Thread: ["VM_RedefineClasses::flush_dependent_code", "void", ["pointer", "pointer", "pointer"]], _ZN19ResolvedMethodTable21adjust_method_entriesEPb: ["ResolvedMethodTable::adjust_method_entries", "void", ["pointer"]], _ZN15MemberNameTable21adjust_method_entriesEP13InstanceKlassPb: ["MemberNameTable::adjust_method_entries", "void", ["pointer", "pointer", "pointer"]], _ZN17ConstantPoolCache21adjust_method_entriesEPb: function (a) { let c = new NativeFunction(a, "void", ["pointer", "pointer"], Ve); this["ConstantPoolCache::adjust_method_entries"] = function (d, p, f) { c(d, f) } }, _ZN17ConstantPoolCache21adjust_method_entriesEP13InstanceKlassPb: function (a) { let c = new NativeFunction(a, "void", ["pointer", "pointer", "pointer"], Ve); this["ConstantPoolCache::adjust_method_entries"] = function (d, p, f) { c(d, p, f) } }, _ZN20ClassLoaderDataGraph10classes_doEP12KlassClosure: ["ClassLoaderDataGraph::classes_do", "void", ["pointer"]], _ZN20ClassLoaderDataGraph22clean_deallocate_listsEb: ["ClassLoaderDataGraph::clean_deallocate_lists", "void", ["int"]], _ZN10JavaThread27thread_from_jni_environmentEP7JNIEnv_: ["JavaThread::thread_from_jni_environment", "pointer", ["pointer"]], _ZN8VMThread7executeEP12VM_Operation: ["VMThread::execute", "void", ["pointer"]], _ZN11OopMapCache22flush_obsolete_entriesEv: ["OopMapCache::flush_obsolete_entries", "void", ["pointer"]], _ZN14NMethodSweeper11force_sweepEv: ["NMethodSweeper::force_sweep", "void", []], _ZN14NMethodSweeper16sweep_code_cacheEv: ["NMethodSweeper::sweep_code_cache", "void", []], _ZN14NMethodSweeper17sweep_in_progressEv: ["NMethodSweeper::sweep_in_progress", "bool", []], JVM_Sleep: ["JVM_Sleep", "void", ["pointer", "pointer", "long"]] }, variables: { _ZN18VM_RedefineClasses14_the_class_oopE: function (a) { this.redefineClass = a }, _ZN18VM_RedefineClasses10_the_classE: function (a) { this.redefineClass = a }, _ZN18VM_RedefineClasses25AdjustCpoolCacheAndVtable8do_klassEP5Klass: function (a) { this.doKlass = a }, _ZN18VM_RedefineClasses22AdjustAndCleanMetadata8do_klassEP5Klass: function (a) { this.doKlass = a }, _ZTV18VM_RedefineClasses: function (a) { this.vtableRedefineClasses = a }, _ZN18VM_RedefineClasses4doitEv: function (a) { this.redefineClassesDoIt = a }, _ZN18VM_RedefineClasses13doit_prologueEv: function (a) { this.redefineClassesDoItPrologue = a }, _ZN18VM_RedefineClasses13doit_epilogueEv: function (a) { this.redefineClassesDoItEpilogue = a }, _ZN18VM_RedefineClassesD0Ev: function (a) { this.redefineClassesDispose0 = a }, _ZN18VM_RedefineClassesD1Ev: function (a) { this.redefineClassesDispose1 = a }, _ZNK18VM_RedefineClasses26allow_nested_vm_operationsEv: function (a) { this.redefineClassesAllow = a }, _ZNK18VM_RedefineClasses14print_on_errorEP12outputStream: function (a) { this.redefineClassesOnError = a }, _ZN13InstanceKlass33create_new_default_vtable_indicesEiP10JavaThread: function (a) { this.createNewDefaultVtableIndices = a }, _ZN13InstanceKlass33create_new_default_vtable_indicesEiP6Thread: function (a) { this.createNewDefaultVtableIndices = a }, _ZN19Abstract_VM_Version19jre_release_versionEv: function (a) { let d = new NativeFunction(a, "pointer", [], Ve)().readCString(); this.version = d.startsWith("1.8") ? 8 : d.startsWith("9.") ? 9 : parseInt(d.slice(0, 2), 10), this.versionS = d }, _ZN14NMethodSweeper11_traversalsE: function (a) { this.traversals = a }, _ZN14NMethodSweeper21_sweep_fractions_leftE: function (a) { this.fractions = a }, _ZN14NMethodSweeper13_should_sweepE: function (a) { this.shouldSweep = a } }, optionals: ["_ZN6Method24restore_unshareable_infoEP10JavaThread", "_ZN6Method24restore_unshareable_infoEP6Thread", "_ZN6Method11link_methodERK12methodHandleP10JavaThread", "_ZN6Method10clear_codeEv", "_ZN6Method10clear_codeEb", "_ZN18VM_RedefineClasses19mark_dependent_codeEP13InstanceKlass", "_ZN18VM_RedefineClasses20flush_dependent_codeEv", "_ZN18VM_RedefineClasses20flush_dependent_codeEP13InstanceKlassP6Thread", "_ZN18VM_RedefineClasses20flush_dependent_codeE19instanceKlassHandleP6Thread", "_ZN19ResolvedMethodTable21adjust_method_entriesEPb", "_ZN15MemberNameTable21adjust_method_entriesEP13InstanceKlassPb", "_ZN17ConstantPoolCache21adjust_method_entriesEPb", "_ZN17ConstantPoolCache21adjust_method_entriesEP13InstanceKlassPb", "_ZN20ClassLoaderDataGraph22clean_deallocate_listsEb", "_ZN10JavaThread27thread_from_jni_environmentEP7JNIEnv_", "_ZN14NMethodSweeper11force_sweepEv", "_ZN14NMethodSweeper17sweep_in_progressEv", "_ZN18VM_RedefineClasses14_the_class_oopE", "_ZN18VM_RedefineClasses10_the_classE", "_ZN18VM_RedefineClasses25AdjustCpoolCacheAndVtable8do_klassEP5Klass", "_ZN18VM_RedefineClasses22AdjustAndCleanMetadata8do_klassEP5Klass", "_ZN18VM_RedefineClassesD0Ev", "_ZN18VM_RedefineClassesD1Ev", "_ZNK18VM_RedefineClasses14print_on_errorEP12outputStream", "_ZN13InstanceKlass33create_new_default_vtable_indicesEiP10JavaThread", "_ZN13InstanceKlass33create_new_default_vtable_indicesEiP6Thread", "_ZN14NMethodSweeper21_sweep_fractions_leftE"] }], o = []; if (r.forEach(function (a) { let c = a.module, d = a.functions || {}, p = a.variables || {}, f = new Set(a.optionals || []), u = c.enumerateExports().reduce(function (h, g) { return h[g.name] = g, h }, {}), _ = c.enumerateSymbols().reduce(function (h, g) { return h[g.name] = g, h }, u); Object.keys(d).forEach(function (h) { let g = _[h]; if (g !== void 0) { let b = d[h]; typeof b == "function" ? b.call(n, g.address) : n[b[0]] = new NativeFunction(g.address, b[1], b[2], Ve) } else f.has(h) || o.push(h) }), Object.keys(p).forEach(function (h) { let g = _[h]; g !== void 0 ? p[h].call(n, g.address) : f.has(h) || o.push(h) }) }), o.length > 0) throw new Error("Java API only partially available; please file a bug. Missing: " + o.join(", ")); let i = Memory.alloc(J), s = Memory.alloc(_d); if (fe("JNI_GetCreatedJavaVMs", n.JNI_GetCreatedJavaVMs(i, 1, s)), s.readInt() === 0) return null; n.vm = i.readPointer(); let l = Process.platform === "windows" ? { $new: ["??2@YAPEAX_K@Z", "pointer", ["ulong"]], $delete: ["??3@YAXPEAX@Z", "void", ["pointer"]] } : { $new: ["_Znwm", "pointer", ["ulong"]], $delete: ["_ZdlPv", "void", ["pointer"]] }; for (let [a, [c, d, p]] of Object.entries(l)) { let f = Module.findGlobalExportByName(c); if (f === null && (f = DebugSymbol.fromName(c).address, f.isNull())) throw new Error(`unable to find C++ allocator API, missing: '${c}'`); n[a] = new NativeFunction(f, d, p, Ve) } return n.jvmti = Cd(n), n["JavaThread::thread_from_jni_environment"] === void 0 && (n["JavaThread::thread_from_jni_environment"] = Ad(n)), n } function Cd(t) { let e = new Ae(t), n; return e.perform(() => { let r = e.tryGetEnvHandle(Tt.v1_0); if (r === null) throw new Error("JVMTI not available"); n = new ke(r, e); let o = Memory.alloc(8); o.writeU64(At.canTagObjects); let i = n.addCapabilities(o); fe("getEnvJvmti::AddCapabilities", i) }), n } function Ad(t) { let e = null, n = Td[Process.arch]; if (n !== void 0) { let o = new Ae(t).perform(i => i.handle.readPointer().add(6 * J).readPointer()); e = Me(o, n, { limit: 11 }) } return e === null ? () => { throw new Error("Unable to make thread_from_jni_environment() helper for the current architecture") } : r => r.add(e) } function xd(t) { if (t.mnemonic !== "lea") return null; let { base: e, disp: n } = t.operands[1].value; return e === "rdi" && n < 0 ? n : null } function Ho(t, e) { } function Vo(t) { hr || (hr = !0, Script.nextTick(Ld, t)) } function Ld(t) { let e = new Map(Ht), n = new Map(bt); Ht.clear(), bt.clear(), hr = !1, t.perform(r => { let o = xe(), i = o["JavaThread::thread_from_jni_environment"](r.handle), s = !1; Zo(() => { e.forEach(l => { let { method: a, originalMethod: c, impl: d, methodId: p, newMethod: f } = l; c === null ? (l.originalMethod = Wo(a), l.newMethod = Md(a, d, i), Jo(l.newMethod, p, i)) : o["Method::set_native_function"](f.method, d, 0) }), n.forEach(l => { let { originalMethod: a, methodId: c, newMethod: d } = l; if (a !== null) { jd(a); let p = a.oldMethod; p.oldMethod = d, Jo(p, c, i), s = !0 } }) }), s && Nd(r.handle) }) } function Nd(t) { let { fractions: e, shouldSweep: n, traversals: r, "NMethodSweeper::sweep_code_cache": o, "NMethodSweeper::sweep_in_progress": i, "NMethodSweeper::force_sweep": s, JVM_Sleep: l } = xe(); if (s !== void 0) Thread.sleep(.05), s(), Thread.sleep(.05), s(); else { let a = r.readS64(), c = a + 2; for (; c > a;)e.writeS32(1), l(t, NULL, 50), i() || Zo(() => { Thread.sleep(.05) }), n.readU8() === 0 && (e.writeS32(1), o()), a = r.readS64() } } function Zo(t, e, n) { let { execute: r, vtable: o, vtableSize: i, doItOffset: s, prologueOffset: l, epilogueOffset: a } = wd(), c = Memory.dup(o, i), d = Memory.alloc(J * 25); d.writePointer(c); let p = new NativeCallback(t, "void", ["pointer"]); c.add(s).writePointer(p); let f = null; e !== void 0 && (f = new NativeCallback(e, "int", ["pointer"]), c.add(l).writePointer(f)); let u = null; n !== void 0 && (u = new NativeCallback(n, "void", ["pointer"]), c.add(a).writePointer(u)), r(d) } function kd() { let { vtableRedefineClasses: t, redefineClassesDoIt: e, redefineClassesDoItPrologue: n, redefineClassesDoItEpilogue: r, redefineClassesOnError: o, redefineClassesAllow: i, redefineClassesDispose0: s, redefineClassesDispose1: l, "VMThread::execute": a } = xe(), c = t.add(2 * J), d = 15 * J, p = Memory.dup(c, d), f = new NativeCallback(() => { }, "void", ["pointer"]), u, _, h; for (let g = 0; g !== d; g += J) { let b = p.add(g), E = b.readPointer(); o !== void 0 && E.equals(o) || s !== void 0 && E.equals(s) || l !== void 0 && E.equals(l) ? b.writePointer(f) : E.equals(e) ? u = g : E.equals(n) ? (_ = g, b.writePointer(i)) : E.equals(r) && (h = g, b.writePointer(f)) } return { execute: a, emptyCallback: f, vtable: p, vtableSize: d, doItOffset: u, prologueOffset: _, epilogueOffset: h } } function qo(t) { return new _r(t) } function Jo(t, e, n) { let { method: r, oldMethod: o } = t, i = xe(); t.methodsArray.add(t.methodIndex * J).writePointer(r), t.vtableIndex >= 0 && t.vtable.add(t.vtableIndex * J).writePointer(r), e.writePointer(r), o.accessFlagsPtr.writeU32((o.accessFlags | gd | bd) >>> 0); let s = i["OopMapCache::flush_obsolete_entries"]; if (s !== void 0) { let { oopMapCache: _ } = t; _.isNull() || s(_) } let l = i["VM_RedefineClasses::mark_dependent_code"], a = i["VM_RedefineClasses::flush_dependent_code"]; l !== void 0 ? (l(NULL, t.instanceKlass), a()) : a(NULL, t.instanceKlass, n); let c = Memory.alloc(1); c.writeU8(1), i["ConstantPoolCache::adjust_method_entries"](t.cache, t.instanceKlass, c); let d = Memory.alloc(3 * J), p = Memory.alloc(J); p.writePointer(i.doKlass), d.writePointer(p), d.add(J).writePointer(n), d.add(2 * J).writePointer(n), i.redefineClass !== void 0 && i.redefineClass.writePointer(t.instanceKlass), i["ClassLoaderDataGraph::classes_do"](d); let f = i["ResolvedMethodTable::adjust_method_entries"]; if (f !== void 0) f(c); else { let { memberNames: _ } = t; if (!_.isNull()) { let h = i["MemberNameTable::adjust_method_entries"]; h !== void 0 && h(_, t.instanceKlass, c) } } let u = i["ClassLoaderDataGraph::clean_deallocate_lists"]; u !== void 0 && u(0) } function Md(t, e, n) { let r = xe(), o = Wo(t); o.constPtr.writePointer(o.const); let i = (o.accessFlags | md | yd | Ed | vd) >>> 0; if (o.accessFlagsPtr.writeU32(i), o.signatureHandler.writePointer(NULL), o.adapter.writePointer(NULL), o.i2iEntry.writePointer(NULL), r["Method::clear_code"](o.method), o.dataPtr.writePointer(NULL), o.countersPtr.writePointer(NULL), o.stackmapPtr.writePointer(NULL), r["Method::clear_native_function"](o.method), r["Method::set_native_function"](o.method, e, 0), r["Method::restore_unshareable_info"](o.method, n), r.version >= 17) { let s = Memory.alloc(2 * J); s.writePointer(o.method), s.add(J).writePointer(n), r["Method::link_method"](o.method, s, n) } return o } function Wo(t) { let e = $o(), n = t.add(e.method.constMethodOffset).readPointer(), r = n.add(e.constMethod.sizeOffset).readS32() * J, o = Memory.alloc(r + e.method.size); Memory.copy(o, n, r); let i = o.add(r); Memory.copy(i, t, e.method.size); let s = Go(i, o, r), l = Go(t, n, r); return s.oldMethod = l, s } function Go(t, e, n) { let r = xe(), o = $o(), i = t.add(o.method.constMethodOffset), s = t.add(o.method.methodDataOffset), l = t.add(o.method.methodCountersOffset), a = t.add(o.method.accessFlagsOffset), c = a.readU32(), d = o.getAdapterPointer(t, e), p = t.add(o.method.i2iEntryOffset), f = t.add(o.method.signatureHandlerOffset), u = e.add(o.constMethod.constantPoolOffset).readPointer(), _ = e.add(o.constMethod.stackmapDataOffset), h = u.add(o.constantPool.instanceKlassOffset).readPointer(), g = u.add(o.constantPool.cacheOffset).readPointer(), b = Sd(), E = h.add(b.methodsOffset).readPointer(), C = E.readS32(), A = E.add(J), M = e.add(o.constMethod.methodIdnumOffset).readU16(), O = t.add(o.method.vtableIndexOffset), k = O.readS32(), N = h.add(b.vtableOffset), S = h.add(b.oopMapCacheOffset).readPointer(), x = r.version >= 10 ? h.add(b.memberNamesOffset).readPointer() : NULL; return { method: t, methodSize: o.method.size, const: e, constSize: n, constPtr: i, dataPtr: s, countersPtr: l, stackmapPtr: _, instanceKlass: h, methodsArray: A, methodsCount: C, methodIndex: M, vtableIndex: k, vtableIndexPtr: O, vtable: N, accessFlags: c, accessFlagsPtr: a, adapter: d, i2iEntry: p, signatureHandler: f, memberNames: x, cache: g, oopMapCache: S } } function jd(t) { let { oldMethod: e } = t; e.accessFlagsPtr.writeU32(e.accessFlags), e.vtableIndexPtr.writeS32(e.vtableIndex) } function Od() { let t = xe(), { version: e } = t, n; e >= 17 ? n = "method:early" : e >= 9 && e <= 16 ? n = "const-method" : n = "method:late"; let o = t["Method::size"](1) * J, i = J, s = 2 * J, l = 3 * J, a = 4 * J, c = n === "method:early" ? J : 0, d = a + c, p = d + 4, f = p + 4 + 8, u = f + J, _ = c !== 0 ? a : u, h = o - 2 * J, g = o - J, b = 8, E = b + J, C = E + J, A = n === "const-method" ? J : 0, M = C + A, O = M + 14, k = 2 * J, N = 3 * J; return { getAdapterPointer: A !== 0 ? function (x, j) { return j.add(C) } : function (x, j) { return x.add(_) }, method: { size: o, constMethodOffset: i, methodDataOffset: s, methodCountersOffset: l, accessFlagsOffset: d, vtableIndexOffset: p, i2iEntryOffset: f, nativeFunctionOffset: h, signatureHandlerOffset: g }, constMethod: { constantPoolOffset: b, stackmapDataOffset: E, sizeOffset: M, methodIdnumOffset: O }, constantPool: { cacheOffset: k, instanceKlassOffset: N } } } function Pd() { let { version: t, createNewDefaultVtableIndices: e } = xe(), n = Rd[Process.arch]; if (n === void 0) throw new Error(`Missing vtable offset parser for ${Process.arch}`); let r = Me(e, n, { limit: 32 }); if (r === null) throw new Error("Unable to deduce vtable offset"); let o = t >= 10 && t <= 11 || t >= 15 ? 17 : 18, i = r - 7 * J, s = r - 17 * J, l = r - o * J; return { vtableOffset: r, methodsOffset: i, memberNamesOffset: s, oopMapCacheOffset: l } } function Fd(t) { if (t.mnemonic !== "mov") return null; let e = t.operands[0]; if (e.type !== "mem") return null; let { value: n } = e; if (n.scale !== 1) return null; let { disp: r } = n; return r < 256 ? null : r + 16 } var _d, J, md, gd, bd, yd, Ed, vd, Ve, $o, Sd, wd, fr, hr, Ht, bt, Td, _r, Rd, mr = te(() => { U(); pn(); fn(); hn(); We(); kt(); _d = 4, { pointerSize: J } = Process, md = 256, gd = 65536, bd = 131072, yd = 33554432, Ed = 67108864, vd = 134217728, Ve = { exceptions: "propagate" }, $o = ue(Od), Sd = ue(Pd), wd = ue(kd), fr = null, hr = !1, Ht = new Map, bt = new Map; Td = { x64: xd }; _r = class { constructor(e) { this.methodId = e, this.method = e.readPointer(), this.originalMethod = null, this.newMethod = null, this.resolved = null, this.impl = null, this.key = e.toString(16) } replace(e, n, r, o, i) { let { key: s } = this, l = bt.get(s); l !== void 0 && (bt.delete(s), this.method = l.method, this.originalMethod = l.originalMethod, this.newMethod = l.newMethod, this.resolved = l.resolved), this.impl = e, Ht.set(s, this), Vo(o) } revert(e) { let { key: n } = this; Ht.delete(n), bt.set(n, this), Vo(e) } resolveTarget(e, n, r, o) { let { resolved: i, originalMethod: s, methodId: l } = this; if (i !== null) return i; if (s === null) return l; s.oldMethod.vtableIndexPtr.writeS32(-2); let c = Memory.alloc(J); return c.writePointer(this.method), this.resolved = c, c } }; Rd = { x64: Fd } }); var Ko, yt, gr = te(() => { U(); gt(); mr(); Ko = G; try { mt() } catch { Ko = xe } yt = Ko }); function Qo(t) { we === null && (we = Bd(t), Yo = zd(we, t.vm)) } function Bd(t) { let e = yt(), { jvmti: n = null } = e, { pointerSize: r } = Process, o = 8, i = r, s = 7 * r, l = 10 * 4 + 5 * r, a = o + i + s + l, d = Memory.alloc(a), p = d.add(o), f = p.add(i), { getDeclaredMethods: u, getDeclaredFields: _ } = t.javaLangClass(), h = t.javaLangReflectMethod(), g = t.javaLangReflectField(), b = f;[n !== null ? n : NULL, u, _, h.getName, h.getModifiers, g.getName, g.getModifiers].forEach(k => { b = b.writePointer(k).add(r) }); let E = f.add(s), { vm: C } = t; if (e.flavor === "art") { let k; if (n !== null) k = [0, 0, 0, 0]; else { let j = er(C).offset; k = [j.ifields, j.methods, j.sfields, j.copiedMethodsOffset] } let N = be(C), S = Jt(C), x = E;[1, ...k, N.size, N.offset.accessFlags, S.size, S.offset.accessFlags, 4294967295].forEach(j => { x = x.writeUInt(j).add(4) }), [e.artClassLinker.address, e["art::ClassLinker::VisitClasses"], e["art::mirror::Class::GetDescriptor"], e["art::ArtMethod::PrettyMethod"], Process.getModuleByName("libc.so").getExportByName("free")].forEach((j, w) => { j === void 0 && (j = NULL), x = x.writePointer(j).add(r) }) } let A = new CModule(Dd, { lock: d, models: p, java_api: f, art_api: E }), M = { exceptions: "propagate" }, O = { exceptions: "propagate", scheduling: "exclusive" }; return { handle: A, new: new NativeFunction(A.model_new, "pointer", ["pointer", "pointer", "pointer"], M), has: new NativeFunction(A.model_has, "bool", ["pointer", "pointer"], O), find: new NativeFunction(A.model_find, "pointer", ["pointer", "pointer"], O), list: new NativeFunction(A.model_list, "pointer", ["pointer"], O), enumerateMethodsArt: new NativeFunction(A.enumerate_methods_art, "pointer", ["pointer", "pointer", "bool", "bool", "bool"], M), enumerateMethodsJvm: new NativeFunction(A.enumerate_methods_jvm, "pointer", ["pointer", "pointer", "bool", "bool", "bool", "pointer"], M), dealloc: new NativeFunction(A.dealloc, "void", ["pointer"], O) } } function zd(t, e) { let n = yt(); if (n.flavor !== "art") return Vd; let r = n["art::JavaVMExt::DecodeGlobal"]; return function (o, i, s) { let l; return Se(e, i, a => { let c = r(e, a, o); l = s(c) }), l } } function Vd(t, e, n) { return n(NULL) } function Xe(t) { return t ? 1 : 0 } var Dd, Ud, we, Yo, Je, br = te(() => {
  U(); gt(); gr(); Dd = `#include <json-glib/json-glib.h>
#include <string.h>

#define kAccStatic 0x0008
#define kAccConstructor 0x00010000

typedef struct _Model Model;
typedef struct _EnumerateMethodsContext EnumerateMethodsContext;

typedef struct _JavaApi JavaApi;
typedef struct _JavaClassApi JavaClassApi;
typedef struct _JavaMethodApi JavaMethodApi;
typedef struct _JavaFieldApi JavaFieldApi;

typedef struct _JNIEnv JNIEnv;
typedef guint8 jboolean;
typedef gint32 jint;
typedef jint jsize;
typedef gpointer jobject;
typedef jobject jclass;
typedef jobject jstring;
typedef jobject jarray;
typedef jarray jobjectArray;
typedef gpointer jfieldID;
typedef gpointer jmethodID;

typedef struct _jvmtiEnv jvmtiEnv;
typedef enum
{
  JVMTI_ERROR_NONE = 0
} jvmtiError;

typedef struct _ArtApi ArtApi;
typedef guint32 ArtHeapReference;
typedef struct _ArtObject ArtObject;
typedef struct _ArtClass ArtClass;
typedef struct _ArtClassLinker ArtClassLinker;
typedef struct _ArtClassVisitor ArtClassVisitor;
typedef struct _ArtClassVisitorVTable ArtClassVisitorVTable;
typedef struct _ArtMethod ArtMethod;
typedef struct _ArtString ArtString;

typedef union _StdString StdString;
typedef struct _StdStringShort StdStringShort;
typedef struct _StdStringLong StdStringLong;

typedef void (* ArtVisitClassesFunc) (ArtClassLinker * linker, ArtClassVisitor * visitor);
typedef const char * (* ArtGetClassDescriptorFunc) (ArtClass * klass, StdString * storage);
typedef void (* ArtPrettyMethodFunc) (StdString * result, ArtMethod * method, jboolean with_signature);

struct _Model
{
  GHashTable * members;
};

struct _EnumerateMethodsContext
{
  GPatternSpec * class_query;
  GPatternSpec * method_query;
  jboolean include_signature;
  jboolean ignore_case;
  jboolean skip_system_classes;
  GHashTable * groups;
};

struct _JavaClassApi
{
  jmethodID get_declared_methods;
  jmethodID get_declared_fields;
};

struct _JavaMethodApi
{
  jmethodID get_name;
  jmethodID get_modifiers;
};

struct _JavaFieldApi
{
  jmethodID get_name;
  jmethodID get_modifiers;
};

struct _JavaApi
{
  jvmtiEnv * jvmti;
  JavaClassApi clazz;
  JavaMethodApi method;
  JavaFieldApi field;
};

struct _JNIEnv
{
  gpointer * functions;
};

struct _jvmtiEnv
{
  gpointer * functions;
};

struct _ArtApi
{
  gboolean available;

  guint class_offset_ifields;
  guint class_offset_methods;
  guint class_offset_sfields;
  guint class_offset_copied_methods_offset;

  guint method_size;
  guint method_offset_access_flags;

  guint field_size;
  guint field_offset_access_flags;

  guint alignment_padding;

  ArtClassLinker * linker;
  ArtVisitClassesFunc visit_classes;
  ArtGetClassDescriptorFunc get_class_descriptor;
  ArtPrettyMethodFunc pretty_method;

  void (* free) (gpointer mem);
};

struct _ArtObject
{
  ArtHeapReference klass;
  ArtHeapReference monitor;
};

struct _ArtClass
{
  ArtObject parent;

  ArtHeapReference class_loader;
};

struct _ArtClassVisitor
{
  ArtClassVisitorVTable * vtable;
  gpointer user_data;
};

struct _ArtClassVisitorVTable
{
  void (* reserved1) (ArtClassVisitor * self);
  void (* reserved2) (ArtClassVisitor * self);
  jboolean (* visit) (ArtClassVisitor * self, ArtClass * klass);
};

struct _ArtString
{
  ArtObject parent;

  gint32 count;
  guint32 hash_code;

  union
  {
    guint16 value[0];
    guint8 value_compressed[0];
  };
};

struct _StdStringShort
{
  guint8 size;
  gchar data[(3 * sizeof (gpointer)) - sizeof (guint8)];
};

struct _StdStringLong
{
  gsize capacity;
  gsize size;
  gchar * data;
};

union _StdString
{
  StdStringShort s;
  StdStringLong l;
};

static void model_add_method (Model * self, const gchar * name, jmethodID id, jint modifiers);
static void model_add_field (Model * self, const gchar * name, jfieldID id, jint modifiers);
static void model_free (Model * model);

static jboolean collect_matching_class_methods (ArtClassVisitor * self, ArtClass * klass);
static gchar * finalize_method_groups_to_json (GHashTable * groups);
static GPatternSpec * make_pattern_spec (const gchar * pattern, jboolean ignore_case);
static gchar * class_name_from_signature (const gchar * signature);
static gchar * format_method_signature (const gchar * name, const gchar * signature);
static void append_type (GString * output, const gchar ** type);

static gpointer read_art_array (gpointer object_base, guint field_offset, guint length_size, guint * length);

static void std_string_destroy (StdString * str);
static gchar * std_string_c_str (StdString * self);

extern GMutex lock;
extern GArray * models;
extern JavaApi java_api;
extern ArtApi art_api;

void
init (void)
{
  g_mutex_init (&lock);
  models = g_array_new (FALSE, FALSE, sizeof (Model *));
}

void
finalize (void)
{
  guint n, i;

  n = models->len;
  for (i = 0; i != n; i++)
  {
    Model * model = g_array_index (models, Model *, i);
    model_free (model);
  }

  g_array_unref (models);
  g_mutex_clear (&lock);
}

Model *
model_new (jclass class_handle,
           gpointer class_object,
           JNIEnv * env)
{
  Model * model;
  GHashTable * members;
  jvmtiEnv * jvmti = java_api.jvmti;
  gpointer * funcs = env->functions;
  jmethodID (* from_reflected_method) (JNIEnv *, jobject) = funcs[7];
  jfieldID (* from_reflected_field) (JNIEnv *, jobject) = funcs[8];
  jobject (* to_reflected_method) (JNIEnv *, jclass, jmethodID, jboolean) = funcs[9];
  jobject (* to_reflected_field) (JNIEnv *, jclass, jfieldID, jboolean) = funcs[12];
  void (* delete_local_ref) (JNIEnv *, jobject) = funcs[23];
  jobject (* call_object_method) (JNIEnv *, jobject, jmethodID, ...) = funcs[34];
  jint (* call_int_method) (JNIEnv *, jobject, jmethodID, ...) = funcs[49];
  const char * (* get_string_utf_chars) (JNIEnv *, jstring, jboolean *) = funcs[169];
  void (* release_string_utf_chars) (JNIEnv *, jstring, const char *) = funcs[170];
  jsize (* get_array_length) (JNIEnv *, jarray) = funcs[171];
  jobject (* get_object_array_element) (JNIEnv *, jobjectArray, jsize) = funcs[173];
  jsize n, i;

  model = g_new (Model, 1);

  members = g_hash_table_new_full (g_str_hash, g_str_equal, g_free, g_free);
  model->members = members;

  if (jvmti != NULL)
  {
    gpointer * jf = jvmti->functions - 1;
    jvmtiError (* deallocate) (jvmtiEnv *, void * mem) = jf[47];
    jvmtiError (* get_class_methods) (jvmtiEnv *, jclass, jint *, jmethodID **) = jf[52];
    jvmtiError (* get_class_fields) (jvmtiEnv *, jclass, jint *, jfieldID **) = jf[53];
    jvmtiError (* get_field_name) (jvmtiEnv *, jclass, jfieldID, char **, char **, char **) = jf[60];
    jvmtiError (* get_field_modifiers) (jvmtiEnv *, jclass, jfieldID, jint *) = jf[62];
    jvmtiError (* get_method_name) (jvmtiEnv *, jmethodID, char **, char **, char **) = jf[64];
    jvmtiError (* get_method_modifiers) (jvmtiEnv *, jmethodID, jint *) = jf[66];
    jint method_count;
    jmethodID * methods;
    jint field_count;
    jfieldID * fields;
    char * name;
    jint modifiers;

    get_class_methods (jvmti, class_handle, &method_count, &methods);
    for (i = 0; i != method_count; i++)
    {
      jmethodID method = methods[i];

      get_method_name (jvmti, method, &name, NULL, NULL);
      get_method_modifiers (jvmti, method, &modifiers);

      model_add_method (model, name, method, modifiers);

      deallocate (jvmti, name);
    }
    deallocate (jvmti, methods);

    get_class_fields (jvmti, class_handle, &field_count, &fields);
    for (i = 0; i != field_count; i++)
    {
      jfieldID field = fields[i];

      get_field_name (jvmti, class_handle, field, &name, NULL, NULL);
      get_field_modifiers (jvmti, class_handle, field, &modifiers);

      model_add_field (model, name, field, modifiers);

      deallocate (jvmti, name);
    }
    deallocate (jvmti, fields);
  }
  else if (art_api.available)
  {
    gpointer elements;
    guint n, i;
    const guint field_arrays[] = {
      art_api.class_offset_ifields,
      art_api.class_offset_sfields
    };
    guint field_array_cursor;
    gboolean merged_fields = art_api.class_offset_sfields == 0;

    elements = read_art_array (class_object, art_api.class_offset_methods, sizeof (gsize), NULL);
    n = *(guint16 *) (class_object + art_api.class_offset_copied_methods_offset);
    for (i = 0; i != n; i++)
    {
      jmethodID id;
      guint32 access_flags;
      jboolean is_static;
      jobject method, name;
      const char * name_str;
      jint modifiers;

      id = elements + (i * art_api.method_size);

      access_flags = *(guint32 *) (id + art_api.method_offset_access_flags);
      if ((access_flags & kAccConstructor) != 0)
        continue;
      is_static = (access_flags & kAccStatic) != 0;
      method = to_reflected_method (env, class_handle, id, is_static);
      name = call_object_method (env, method, java_api.method.get_name);
      name_str = get_string_utf_chars (env, name, NULL);
      modifiers = access_flags & 0xffff;

      model_add_method (model, name_str, id, modifiers);

      release_string_utf_chars (env, name, name_str);
      delete_local_ref (env, name);
      delete_local_ref (env, method);
    }

    for (field_array_cursor = 0; field_array_cursor != G_N_ELEMENTS (field_arrays); field_array_cursor++)
    {
      jboolean is_static;

      if (field_arrays[field_array_cursor] == 0)
        continue;

      if (!merged_fields)
        is_static = field_array_cursor == 1;

      elements = read_art_array (class_object, field_arrays[field_array_cursor], sizeof (guint32), &n);
      for (i = 0; i != n; i++)
      {
        jfieldID id;
        guint32 access_flags;
        jobject field, name;
        const char * name_str;
        jint modifiers;

        id = elements + (i * art_api.field_size);

        access_flags = *(guint32 *) (id + art_api.field_offset_access_flags);
        if (merged_fields)
          is_static = (access_flags & kAccStatic) != 0;
        field = to_reflected_field (env, class_handle, id, is_static);
        name = call_object_method (env, field, java_api.field.get_name);
        name_str = get_string_utf_chars (env, name, NULL);
        modifiers = access_flags & 0xffff;

        model_add_field (model, name_str, id, modifiers);

        release_string_utf_chars (env, name, name_str);
        delete_local_ref (env, name);
        delete_local_ref (env, field);
      }
    }
  }
  else
  {
    jobject elements;

    elements = call_object_method (env, class_handle, java_api.clazz.get_declared_methods);
    n = get_array_length (env, elements);
    for (i = 0; i != n; i++)
    {
      jobject method, name;
      const char * name_str;
      jmethodID id;
      jint modifiers;

      method = get_object_array_element (env, elements, i);
      name = call_object_method (env, method, java_api.method.get_name);
      name_str = get_string_utf_chars (env, name, NULL);
      id = from_reflected_method (env, method);
      modifiers = call_int_method (env, method, java_api.method.get_modifiers);

      model_add_method (model, name_str, id, modifiers);

      release_string_utf_chars (env, name, name_str);
      delete_local_ref (env, name);
      delete_local_ref (env, method);
    }
    delete_local_ref (env, elements);

    elements = call_object_method (env, class_handle, java_api.clazz.get_declared_fields);
    n = get_array_length (env, elements);
    for (i = 0; i != n; i++)
    {
      jobject field, name;
      const char * name_str;
      jfieldID id;
      jint modifiers;

      field = get_object_array_element (env, elements, i);
      name = call_object_method (env, field, java_api.field.get_name);
      name_str = get_string_utf_chars (env, name, NULL);
      id = from_reflected_field (env, field);
      modifiers = call_int_method (env, field, java_api.field.get_modifiers);

      model_add_field (model, name_str, id, modifiers);

      release_string_utf_chars (env, name, name_str);
      delete_local_ref (env, name);
      delete_local_ref (env, field);
    }
    delete_local_ref (env, elements);
  }

  g_mutex_lock (&lock);
  g_array_append_val (models, model);
  g_mutex_unlock (&lock);

  return model;
}

static void
model_add_method (Model * self,
                  const gchar * name,
                  jmethodID id,
                  jint modifiers)
{
  GHashTable * members = self->members;
  gchar * key, type;
  const gchar * value;

  if (name[0] == '$')
    key = g_strdup_printf ("_%s", name);
  else
    key = g_strdup (name);

  type = (modifiers & kAccStatic) != 0 ? 's' : 'i';

  value = g_hash_table_lookup (members, key);
  if (value == NULL)
    g_hash_table_insert (members, key, g_strdup_printf ("m:%c0x%zx", type, id));
  else
    g_hash_table_insert (members, key, g_strdup_printf ("%s:%c0x%zx", value, type, id));
}

static void
model_add_field (Model * self,
                 const gchar * name,
                 jfieldID id,
                 jint modifiers)
{
  GHashTable * members = self->members;
  gchar * key, type;

  if (name[0] == '$')
    key = g_strdup_printf ("_%s", name);
  else
    key = g_strdup (name);
  while (g_hash_table_contains (members, key))
  {
    gchar * new_key = g_strdup_printf ("_%s", key);
    g_free (key);
    key = new_key;
  }

  type = (modifiers & kAccStatic) != 0 ? 's' : 'i';

  g_hash_table_insert (members, key, g_strdup_printf ("f:%c0x%zx", type, id));
}

static void
model_free (Model * model)
{
  g_hash_table_unref (model->members);

  g_free (model);
}

gboolean
model_has (Model * self,
           const gchar * member)
{
  return g_hash_table_contains (self->members, member);
}

const gchar *
model_find (Model * self,
            const gchar * member)
{
  return g_hash_table_lookup (self->members, member);
}

gchar *
model_list (Model * self)
{
  GString * result;
  GHashTableIter iter;
  guint i;
  const gchar * name;

  result = g_string_sized_new (128);

  g_string_append_c (result, '[');

  g_hash_table_iter_init (&iter, self->members);
  for (i = 0; g_hash_table_iter_next (&iter, (gpointer *) &name, NULL); i++)
  {
    if (i > 0)
      g_string_append_c (result, ',');

    g_string_append_c (result, '"');
    g_string_append (result, name);
    g_string_append_c (result, '"');
  }

  g_string_append_c (result, ']');

  return g_string_free (result, FALSE);
}

gchar *
enumerate_methods_art (const gchar * class_query,
                       const gchar * method_query,
                       jboolean include_signature,
                       jboolean ignore_case,
                       jboolean skip_system_classes)
{
  gchar * result;
  EnumerateMethodsContext ctx;
  ArtClassVisitor visitor;
  ArtClassVisitorVTable visitor_vtable = { NULL, };

  ctx.class_query = make_pattern_spec (class_query, ignore_case);
  ctx.method_query = make_pattern_spec (method_query, ignore_case);
  ctx.include_signature = include_signature;
  ctx.ignore_case = ignore_case;
  ctx.skip_system_classes = skip_system_classes;
  ctx.groups = g_hash_table_new_full (NULL, NULL, NULL, NULL);

  visitor.vtable = &visitor_vtable;
  visitor.user_data = &ctx;

  visitor_vtable.visit = collect_matching_class_methods;

  art_api.visit_classes (art_api.linker, &visitor);

  result = finalize_method_groups_to_json (ctx.groups);

  g_hash_table_unref (ctx.groups);
  g_pattern_spec_free (ctx.method_query);
  g_pattern_spec_free (ctx.class_query);

  return result;
}

static jboolean
collect_matching_class_methods (ArtClassVisitor * self,
                                ArtClass * klass)
{
  EnumerateMethodsContext * ctx = self->user_data;
  const char * descriptor;
  StdString descriptor_storage = { 0, };
  gchar * class_name = NULL;
  gchar * class_name_copy = NULL;
  const gchar * normalized_class_name;
  JsonBuilder * group;
  size_t class_name_length;
  GHashTable * seen_method_names;
  gpointer elements;
  guint n, i;

  if (ctx->skip_system_classes && klass->class_loader == 0)
    goto skip_class;

  descriptor = art_api.get_class_descriptor (klass, &descriptor_storage);
  if (descriptor[0] != 'L')
    goto skip_class;

  class_name = class_name_from_signature (descriptor);

  if (ctx->ignore_case)
  {
    class_name_copy = g_utf8_strdown (class_name, -1);
    normalized_class_name = class_name_copy;
  }
  else
  {
    normalized_class_name = class_name;
  }

  if (!g_pattern_match_string (ctx->class_query, normalized_class_name))
    goto skip_class;

  group = NULL;
  class_name_length = strlen (class_name);
  seen_method_names = ctx->include_signature ? NULL : g_hash_table_new_full (g_str_hash, g_str_equal, g_free, NULL);

  elements = read_art_array (klass, art_api.class_offset_methods, sizeof (gsize), NULL);
  n = *(guint16 *) ((gpointer) klass + art_api.class_offset_copied_methods_offset);
  for (i = 0; i != n; i++)
  {
    ArtMethod * method;
    guint32 access_flags;
    jboolean is_constructor;
    StdString method_name = { 0, };
    const gchar * bare_method_name;
    gchar * bare_method_name_copy = NULL;
    const gchar * normalized_method_name;
    gchar * normalized_method_name_copy = NULL;

    method = elements + (i * art_api.method_size);

    access_flags = *(guint32 *) ((gpointer) method + art_api.method_offset_access_flags);
    is_constructor = (access_flags & kAccConstructor) != 0;

    art_api.pretty_method (&method_name, method, ctx->include_signature);
    bare_method_name = std_string_c_str (&method_name);
    if (ctx->include_signature)
    {
      const gchar * return_type_end, * name_begin;
      GString * name;

      return_type_end = strchr (bare_method_name, ' ');
      name_begin = return_type_end + 1 + class_name_length + 1;
      if (is_constructor && g_str_has_prefix (name_begin, "<clinit>"))
        goto skip_method;

      name = g_string_sized_new (64);

      if (is_constructor)
      {
        g_string_append (name, "$init");
        g_string_append (name, strchr (name_begin, '>') + 1);
      }
      else
      {
        g_string_append (name, name_begin);
      }
      g_string_append (name, ": ");
      g_string_append_len (name, bare_method_name, return_type_end - bare_method_name);

      bare_method_name_copy = g_string_free (name, FALSE);
      bare_method_name = bare_method_name_copy;
    }
    else
    {
      const gchar * name_begin;

      name_begin = bare_method_name + class_name_length + 1;
      if (is_constructor && strcmp (name_begin, "<clinit>") == 0)
        goto skip_method;

      if (is_constructor)
        bare_method_name = "$init";
      else
        bare_method_name += class_name_length + 1;
    }

    if (seen_method_names != NULL && g_hash_table_contains (seen_method_names, bare_method_name))
      goto skip_method;

    if (ctx->ignore_case)
    {
      normalized_method_name_copy = g_utf8_strdown (bare_method_name, -1);
      normalized_method_name = normalized_method_name_copy;
    }
    else
    {
      normalized_method_name = bare_method_name;
    }

    if (!g_pattern_match_string (ctx->method_query, normalized_method_name))
      goto skip_method;

    if (group == NULL)
    {
      group = g_hash_table_lookup (ctx->groups, GUINT_TO_POINTER (klass->class_loader));
      if (group == NULL)
      {
        group = json_builder_new_immutable ();
        g_hash_table_insert (ctx->groups, GUINT_TO_POINTER (klass->class_loader), group);

        json_builder_begin_object (group);

        json_builder_set_member_name (group, "loader");
        json_builder_add_int_value (group, klass->class_loader);

        json_builder_set_member_name (group, "classes");
        json_builder_begin_array (group);
      }

      json_builder_begin_object (group);

      json_builder_set_member_name (group, "name");
      json_builder_add_string_value (group, class_name);

      json_builder_set_member_name (group, "methods");
      json_builder_begin_array (group);
    }

    json_builder_add_string_value (group, bare_method_name);

    if (seen_method_names != NULL)
      g_hash_table_add (seen_method_names, g_strdup (bare_method_name));

skip_method:
    g_free (normalized_method_name_copy);
    g_free (bare_method_name_copy);
    std_string_destroy (&method_name);
  }

  if (seen_method_names != NULL)
    g_hash_table_unref (seen_method_names);

  if (group == NULL)
    goto skip_class;

  json_builder_end_array (group);
  json_builder_end_object (group);

skip_class:
  g_free (class_name_copy);
  g_free (class_name);
  std_string_destroy (&descriptor_storage);

  return TRUE;
}

gchar *
enumerate_methods_jvm (const gchar * class_query,
                       const gchar * method_query,
                       jboolean include_signature,
                       jboolean ignore_case,
                       jboolean skip_system_classes,
                       JNIEnv * env)
{
  gchar * result;
  GPatternSpec * class_pattern, * method_pattern;
  GHashTable * groups;
  gpointer * ef = env->functions;
  jobject (* new_global_ref) (JNIEnv *, jobject) = ef[21];
  void (* delete_local_ref) (JNIEnv *, jobject) = ef[23];
  jboolean (* is_same_object) (JNIEnv *, jobject, jobject) = ef[24];
  jvmtiEnv * jvmti = java_api.jvmti;
  gpointer * jf = jvmti->functions - 1;
  jvmtiError (* deallocate) (jvmtiEnv *, void * mem) = jf[47];
  jvmtiError (* get_class_signature) (jvmtiEnv *, jclass, char **, char **) = jf[48];
  jvmtiError (* get_class_methods) (jvmtiEnv *, jclass, jint *, jmethodID **) = jf[52];
  jvmtiError (* get_class_loader) (jvmtiEnv *, jclass, jobject *) = jf[57];
  jvmtiError (* get_method_name) (jvmtiEnv *, jmethodID, char **, char **, char **) = jf[64];
  jvmtiError (* get_loaded_classes) (jvmtiEnv *, jint *, jclass **) = jf[78];
  jint class_count, class_index;
  jclass * classes;

  class_pattern = make_pattern_spec (class_query, ignore_case);
  method_pattern = make_pattern_spec (method_query, ignore_case);
  groups = g_hash_table_new_full (NULL, NULL, NULL, NULL);

  if (get_loaded_classes (jvmti, &class_count, &classes) != JVMTI_ERROR_NONE)
    goto emit_results;

  for (class_index = 0; class_index != class_count; class_index++)
  {
    jclass klass = classes[class_index];
    jobject loader = NULL;
    gboolean have_loader = FALSE;
    char * signature = NULL;
    gchar * class_name = NULL;
    gchar * class_name_copy = NULL;
    const gchar * normalized_class_name;
    jint method_count, method_index;
    jmethodID * methods = NULL;
    JsonBuilder * group = NULL;
    GHashTable * seen_method_names = NULL;

    if (skip_system_classes)
    {
      if (get_class_loader (jvmti, klass, &loader) != JVMTI_ERROR_NONE)
        goto skip_class;
      have_loader = TRUE;

      if (loader == NULL)
        goto skip_class;
    }

    if (get_class_signature (jvmti, klass, &signature, NULL) != JVMTI_ERROR_NONE)
      goto skip_class;

    class_name = class_name_from_signature (signature);

    if (ignore_case)
    {
      class_name_copy = g_utf8_strdown (class_name, -1);
      normalized_class_name = class_name_copy;
    }
    else
    {
      normalized_class_name = class_name;
    }

    if (!g_pattern_match_string (class_pattern, normalized_class_name))
      goto skip_class;

    if (get_class_methods (jvmti, klass, &method_count, &methods) != JVMTI_ERROR_NONE)
      goto skip_class;

    if (!include_signature)
      seen_method_names = g_hash_table_new_full (g_str_hash, g_str_equal, g_free, NULL);

    for (method_index = 0; method_index != method_count; method_index++)
    {
      jmethodID method = methods[method_index];
      const gchar * method_name;
      char * method_name_value = NULL;
      char * method_signature_value = NULL;
      gchar * method_name_copy = NULL;
      const gchar * normalized_method_name;
      gchar * normalized_method_name_copy = NULL;

      if (get_method_name (jvmti, method, &method_name_value, include_signature ? &method_signature_value : NULL, NULL) != JVMTI_ERROR_NONE)
        goto skip_method;
      method_name = method_name_value;

      if (method_name[0] == '<')
      {
        if (strcmp (method_name, "<init>") == 0)
          method_name = "$init";
        else if (strcmp (method_name, "<clinit>") == 0)
          goto skip_method;
      }

      if (include_signature)
      {
        method_name_copy = format_method_signature (method_name, method_signature_value);
        method_name = method_name_copy;
      }

      if (seen_method_names != NULL && g_hash_table_contains (seen_method_names, method_name))
        goto skip_method;

      if (ignore_case)
      {
        normalized_method_name_copy = g_utf8_strdown (method_name, -1);
        normalized_method_name = normalized_method_name_copy;
      }
      else
      {
        normalized_method_name = method_name;
      }

      if (!g_pattern_match_string (method_pattern, normalized_method_name))
        goto skip_method;

      if (group == NULL)
      {
        if (!have_loader && get_class_loader (jvmti, klass, &loader) != JVMTI_ERROR_NONE)
          goto skip_method;

        if (loader == NULL)
        {
          group = g_hash_table_lookup (groups, NULL);
        }
        else
        {
          GHashTableIter iter;
          jobject cur_loader;
          JsonBuilder * cur_group;

          g_hash_table_iter_init (&iter, groups);
          while (g_hash_table_iter_next (&iter, (gpointer *) &cur_loader, (gpointer *) &cur_group))
          {
            if (cur_loader != NULL && is_same_object (env, cur_loader, loader))
            {
              group = cur_group;
              break;
            }
          }
        }

        if (group == NULL)
        {
          jobject l;
          gchar * str;

          l = (loader != NULL) ? new_global_ref (env, loader) : NULL;

          group = json_builder_new_immutable ();
          g_hash_table_insert (groups, l, group);

          json_builder_begin_object (group);

          json_builder_set_member_name (group, "loader");
          str = g_strdup_printf ("0x%" G_GSIZE_MODIFIER "x", GPOINTER_TO_SIZE (l));
          json_builder_add_string_value (group, str);
          g_free (str);

          json_builder_set_member_name (group, "classes");
          json_builder_begin_array (group);
        }

        json_builder_begin_object (group);

        json_builder_set_member_name (group, "name");
        json_builder_add_string_value (group, class_name);

        json_builder_set_member_name (group, "methods");
        json_builder_begin_array (group);
      }

      json_builder_add_string_value (group, method_name);

      if (seen_method_names != NULL)
        g_hash_table_add (seen_method_names, g_strdup (method_name));

skip_method:
      g_free (normalized_method_name_copy);
      g_free (method_name_copy);
      deallocate (jvmti, method_signature_value);
      deallocate (jvmti, method_name_value);
    }

skip_class:
    if (group != NULL)
    {
      json_builder_end_array (group);
      json_builder_end_object (group);
    }

    if (seen_method_names != NULL)
      g_hash_table_unref (seen_method_names);

    deallocate (jvmti, methods);

    g_free (class_name_copy);
    g_free (class_name);
    deallocate (jvmti, signature);

    if (loader != NULL)
      delete_local_ref (env, loader);

    delete_local_ref (env, klass);
  }

  deallocate (jvmti, classes);

emit_results:
  result = finalize_method_groups_to_json (groups);

  g_hash_table_unref (groups);
  g_pattern_spec_free (method_pattern);
  g_pattern_spec_free (class_pattern);

  return result;
}

static gchar *
finalize_method_groups_to_json (GHashTable * groups)
{
  GString * result;
  GHashTableIter iter;
  guint i;
  JsonBuilder * group;

  result = g_string_sized_new (1024);

  g_string_append_c (result, '[');

  g_hash_table_iter_init (&iter, groups);
  for (i = 0; g_hash_table_iter_next (&iter, NULL, (gpointer *) &group); i++)
  {
    JsonNode * root;
    gchar * json;

    if (i > 0)
      g_string_append_c (result, ',');

    json_builder_end_array (group);
    json_builder_end_object (group);

    root = json_builder_get_root (group);
    json = json_to_string (root, FALSE);
    g_string_append (result, json);
    g_free (json);
    json_node_unref (root);

    g_object_unref (group);
  }

  g_string_append_c (result, ']');

  return g_string_free (result, FALSE);
}

static GPatternSpec *
make_pattern_spec (const gchar * pattern,
                   jboolean ignore_case)
{
  GPatternSpec * spec;

  if (ignore_case)
  {
    gchar * str = g_utf8_strdown (pattern, -1);
    spec = g_pattern_spec_new (str);
    g_free (str);
  }
  else
  {
    spec = g_pattern_spec_new (pattern);
  }

  return spec;
}

static gchar *
class_name_from_signature (const gchar * descriptor)
{
  gchar * result, * c;

  result = g_strdup (descriptor + 1);

  for (c = result; *c != '\\0'; c++)
  {
    if (*c == '/')
      *c = '.';
  }

  c[-1] = '\\0';

  return result;
}

static gchar *
format_method_signature (const gchar * name,
                         const gchar * signature)
{
  GString * sig;
  const gchar * cursor;
  gint arg_index;

  sig = g_string_sized_new (128);

  g_string_append (sig, name);

  cursor = signature;
  arg_index = -1;
  while (TRUE)
  {
    const gchar c = *cursor;

    if (c == '(')
    {
      g_string_append_c (sig, c);
      cursor++;
      arg_index = 0;
    }
    else if (c == ')')
    {
      g_string_append_c (sig, c);
      cursor++;
      break;
    }
    else
    {
      if (arg_index >= 1)
        g_string_append (sig, ", ");

      append_type (sig, &cursor);

      if (arg_index != -1)
        arg_index++;
    }
  }

  g_string_append (sig, ": ");
  append_type (sig, &cursor);

  return g_string_free (sig, FALSE);
}

static void
append_type (GString * output,
             const gchar ** type)
{
  const gchar * cursor = *type;

  switch (*cursor)
  {
    case 'Z':
      g_string_append (output, "boolean");
      cursor++;
      break;
    case 'B':
      g_string_append (output, "byte");
      cursor++;
      break;
    case 'C':
      g_string_append (output, "char");
      cursor++;
      break;
    case 'S':
      g_string_append (output, "short");
      cursor++;
      break;
    case 'I':
      g_string_append (output, "int");
      cursor++;
      break;
    case 'J':
      g_string_append (output, "long");
      cursor++;
      break;
    case 'F':
      g_string_append (output, "float");
      cursor++;
      break;
    case 'D':
      g_string_append (output, "double");
      cursor++;
      break;
    case 'V':
      g_string_append (output, "void");
      cursor++;
      break;
    case 'L':
    {
      gchar ch;

      cursor++;
      for (; (ch = *cursor) != ';'; cursor++)
      {
        g_string_append_c (output, (ch != '/') ? ch : '.');
      }
      cursor++;

      break;
    }
    case '[':
      *type = cursor + 1;
      append_type (output, type);
      g_string_append (output, "[]");
      return;
    default:
      g_string_append (output, "BUG");
      cursor++;
  }

  *type = cursor;
}

void
dealloc (gpointer mem)
{
  g_free (mem);
}

static gpointer
read_art_array (gpointer object_base,
                guint field_offset,
                guint length_size,
                guint * length)
{
  gpointer result, header;
  guint n;

  header = GSIZE_TO_POINTER (*(guint64 *) (object_base + field_offset));
  if (header != NULL)
  {
    result = header + length_size;
    if (length_size == sizeof (guint32))
      n = *(guint32 *) header;
    else
      n = *(guint64 *) header;
  }
  else
  {
    result = NULL;
    n = 0;
  }

  if (length != NULL)
    *length = n;

  return result;
}

static void
std_string_destroy (StdString * str)
{
  if ((str->l.capacity & 1) != 0)
    art_api.free (str->l.data);
}

static gchar *
std_string_c_str (StdString * self)
{
  if ((self->l.capacity & 1) != 0)
    return self->l.data;

  return self->s.data;
}
`, Ud = /(.+)!([^/]+)\/?([isu]+)?/, we = null, Yo = null, Je = class t { static build(e, n) { return Qo(n), Yo(e, n, r => new t(we.new(e, r, n))) } static enumerateMethods(e, n, r) { Qo(r); let o = e.match(Ud); if (o === null) throw new Error("Invalid query; format is: class!method -- see documentation of Java.enumerateMethods(query) for details"); let i = Memory.allocUtf8String(o[1]), s = Memory.allocUtf8String(o[2]), l = !1, a = !1, c = !1, d = o[3]; d !== void 0 && (l = d.indexOf("s") !== -1, a = d.indexOf("i") !== -1, c = d.indexOf("u") !== -1); let p; if (n.jvmti !== null) { let f = we.enumerateMethodsJvm(i, s, Xe(l), Xe(a), Xe(c), r); try { p = JSON.parse(f.readUtf8String()).map(u => { let _ = ptr(u.loader); return u.loader = _.isNull() ? null : _, u }) } finally { we.dealloc(f) } } else Se(r.vm, r, f => { let u = we.enumerateMethodsArt(i, s, Xe(l), Xe(a), Xe(c)); try { let _ = n["art::JavaVMExt::AddGlobalRef"], { vm: h } = n; p = JSON.parse(u.readUtf8String()).map(g => { let b = g.loader; return g.loader = b !== 0 ? _(h, f, ptr(b)) : null, g }) } finally { we.dealloc(u) } }); return p } constructor(e) { this.handle = e } has(e) { return we.has(this.handle, Memory.allocUtf8String(e)) !== 0 } find(e) { return we.find(this.handle, Memory.allocUtf8String(e)).readUtf8String() } list() { let e = we.list(this.handle); try { return JSON.parse(e.readUtf8String()) } finally { we.dealloc(e) } } }
}); var Et, Xo = te(() => { U(); Et = class { constructor(e, n) { this.items = new Map, this.capacity = e, this.destroy = n } dispose(e) { let { items: n, destroy: r } = this; n.forEach(o => { r(o, e) }), n.clear() } get(e) { let { items: n } = this, r = n.get(e); return r !== void 0 && (n.delete(e), n.set(e, r)), r } set(e, n, r) { let { items: o } = this, i = o.get(e); if (i !== void 0) o.delete(e), this.destroy(i, r); else if (o.size === this.capacity) { let s = o.keys().next().value, l = o.get(s); o.delete(s), this.destroy(l, r) } o.set(e, n) } } }); function uu(t) { let e = new Sr, n = Object.assign({}, t); return e.addClass(n), e.build() } function pu(t) { let { instanceFields: e, constructorMethods: n, virtualMethods: r } = t.classData; return m.from([0].concat(ye(e.length)).concat(ye(n.length)).concat(ye(r.length)).concat(e.reduce((i, [s, l]) => i.concat(ye(s)).concat(ye(l)), [])).concat(n.reduce((i, [s, l, , a]) => i.concat(ye(s)).concat(ye(l)).concat(ye(a || 0)), [])).concat(r.reduce((i, [s, l]) => i.concat(ye(s)).concat(ye(l)).concat([0]), []))) } function fu(t) { let { thrownTypes: e } = t; return m.from([lu].concat(ye(t.type)).concat([1]).concat(ye(t.value)).concat([au, e.length]).concat(e.reduce((n, r) => (n.push(su, r), n), []))) } function hu(t) { let e = new Set, n = new Set, r = {}, o = [], i = [], s = {}, l = new Set, a = new Set; t.forEach(w => { let { name: R, superClass: D, sourceFileName: B } = w; e.add("this"), e.add(R), n.add(R), e.add(D), n.add(D), e.add(B), w.interfaces.forEach(F => { e.add(F), n.add(F) }), w.fields.forEach(F => { let [V, ee] = F; e.add(V), e.add(ee), n.add(ee), o.push([w.name, ee, V]) }), w.methods.some(([F]) => F === "<init>") || (w.methods.unshift(["<init>", "V", []]), l.add(R)), w.methods.forEach(F => { let [V, ee, re, ce = [], Y] = F; e.add(V); let ae = c(ee, re), X = null; if (ce.length > 0) { let oe = ce.slice(); oe.sort(), X = oe.join("|"); let Ce = s[X]; Ce === void 0 && (Ce = { id: X, types: oe }, s[X] = Ce), e.add(yr), n.add(yr), ce.forEach(rt => { e.add(rt), n.add(rt) }), e.add("value") } if (i.push([w.name, ae, V, X, Y]), V === "<init>") { a.add(R + "|" + ae); let oe = D + "|" + ae; l.has(R) && !a.has(oe) && (i.push([D, ae, V, null, 0]), a.add(oe)) } }) }); function c(w, R) { let D = [w].concat(R), B = D.join("|"); if (r[B] !== void 0) return B; e.add(w), n.add(w), R.forEach(V => { e.add(V), n.add(V) }); let F = D.map(yu).join(""); return e.add(F), r[B] = [B, F, w, R], B } let d = Array.from(e); d.sort(); let p = d.reduce((w, R, D) => (w[R] = D, w), {}), f = Array.from(n).map(w => p[w]); f.sort(ci); let u = f.reduce((w, R, D) => (w[d[R]] = D, w), {}), _ = Object.keys(r).map(w => r[w]); _.sort(mu); let h = {}, g = _.map(w => { let [, R, D, B] = w, F; if (B.length > 0) { let V = B.join("|"); F = h[V], F === void 0 && (F = { types: B.map(ee => u[ee]), offset: -1 }, h[V] = F) } else F = null; return [p[R], u[D], F] }), b = _.reduce((w, R, D) => { let [B] = R; return w[B] = D, w }, {}), E = Object.keys(h).map(w => h[w]), C = o.map(w => { let [R, D, B] = w; return [u[R], u[D], p[B]] }); C.sort(gu); let A = i.map(w => { let [R, D, B, F, V] = w; return [u[R], b[D], p[B], F, V] }); A.sort(bu); let M = Object.keys(s).map(w => s[w]).map(w => ({ id: w.id, type: u[yr], value: p.value, thrownTypes: w.types.map(R => u[R]), offset: -1 })), O = M.map(w => ({ id: w.id, items: [w], offset: -1 })), k = O.reduce((w, R, D) => (w[R.id] = D, w), {}), N = {}, S = [], x = t.map(w => { let R = u[w.name], D = vt, B = u[w.superClass], F, V = w.interfaces.map(H => u[H]); if (V.length > 0) { V.sort(ci); let H = V.join("|"); F = N[H], F === void 0 && (F = { types: V, offset: -1 }, N[H] = F) } else F = null; let ee = p[w.sourceFileName], re = A.reduce((H, ge, Le) => { let [De, Oe, He, I, de] = ge; return De === R && H.push([Le, He, I, Oe, de]), H }, []), ce = null, Y = re.filter(([, , H]) => H !== null).map(([H, , ge]) => [H, O[k[ge]]]); Y.length > 0 && (ce = { methods: Y, offset: -1 }, S.push(ce)); let ae = C.reduce((H, ge, Le) => { let [De] = ge; return De === R && H.push([Le > 0 ? 1 : 0, vt]), H }, []), X = p["<init>"], oe = re.filter(([, H]) => H === X).map(([H, , , ge]) => { if (l.has(w.name)) { let Le = -1, De = A.length; for (let Oe = 0; Oe !== De; Oe++) { let [He, I, de] = A[Oe]; if (He === B && de === X && I === ge) { Le = Oe; break } } return [H, vt | ei, Le] } else return [H, vt | ei | vr, -1] }), Ce = _u(re.filter(([, H]) => H !== X).map(([H, , , , ge]) => [H, ge | vt | vr])); return { index: R, accessFlags: D, superClassIndex: B, interfaces: F, sourceFileIndex: ee, annotationsDirectory: ce, classData: { instanceFields: ae, constructorMethods: oe, virtualMethods: Ce, offset: -1 } } }), j = Object.keys(N).map(w => N[w]); return { classes: x, interfaces: j, fields: C, methods: A, protos: g, parameters: E, annotationDirectories: S, annotationSets: O, throwsAnnotations: M, types: f, strings: d } } function _u(t) { let e = 0; return t.map(([n, r], o) => { let i; return o === 0 ? i = [n, r] : i = [n - e, r], e = n, i }) } function ci(t, e) { return t - e } function mu(t, e) { let [, , n, r] = t, [, , o, i] = e; if (n < o) return -1; if (n > o) return 1; let s = r.join("|"), l = i.join("|"); return s < l ? -1 : s > l ? 1 : 0 } function gu(t, e) { let [n, r, o] = t, [i, s, l] = e; return n !== i ? n - i : o !== l ? o - l : r - s } function bu(t, e) { let [n, r, o] = t, [i, s, l] = e; return n !== i ? n - i : o !== l ? o - l : r - s } function yu(t) { let e = t[0]; return e === "L" || e === "[" ? "L" : t } function ye(t) { if (t <= 127) return [t]; let e = [], n = !1; do { let r = t & 127; t >>= 7, n = t !== 0, n && (r |= 128), e.push(r) } while (n); return e } function Er(t, e) { let n = t % e; return n === 0 ? t : t + e - n } function Eu(t, e) { let n = 1, r = 0, o = t.length; for (let i = e; i < o; i++)n = (n + t[i]) % 65521, r = (r + n) % 65521; return (r << 16 | n) >>> 0 } var vt, vr, ei, Jd, ti, ni, ri, oi, ii, si, ai, Gd, $d, Hd, Zd, qd, Wd, Kd, Qd, Yd, Xd, eu, tu, nu, ru, ou, iu, su, au, lu, cu, li, yr, du, Sr, di, ui = te(() => {
  U(); io(); vt = 1, vr = 256, ei = 65536, Jd = 305419896, ti = 32, ni = 12, ri = 8, oi = 8, ii = 4, si = 4, ai = 12, Gd = 0, $d = 1, Hd = 2, Zd = 3, qd = 4, Wd = 5, Kd = 6, Qd = 4096, Yd = 4097, Xd = 4099, eu = 8192, tu = 8193, nu = 8194, ru = 8195, ou = 8196, iu = 8198, su = 24, au = 28, lu = 2, cu = 24, li = m.from([3, 0, 7, 14, 0]), yr = "Ldalvik/annotation/Throws;", du = m.from([0]); Sr = class {
    constructor() { this.classes = [] } addClass(e) { this.classes.push(e) } build() {
      let e = hu(this.classes), { classes: n, interfaces: r, fields: o, methods: i, protos: s, parameters: l, annotationDirectories: a, annotationSets: c, throwsAnnotations: d, types: p, strings: f } = e, u = 0, _ = 0, h = 8, g = 12, b = 20, E = 112; u += E; let C = u, A = f.length * si; u += A; let M = u, O = p.length * ii; u += O; let k = u, N = s.length * ni; u += N; let S = u, x = o.length * ri; u += x; let j = u, w = i.length * oi; u += w; let R = u, D = n.length * ti; u += D; let B = u, F = c.map(T => { let P = u; return T.offset = P, u += 4 + T.items.length * 4, P }), V = n.reduce((T, P) => (P.classData.constructorMethods.forEach(Z => { let [, W, q] = Z; (W & vr) === 0 && q >= 0 && (Z.push(u), T.push({ offset: u, superConstructor: q }), u += cu) }), T), []); a.forEach(T => { T.offset = u, u += 16 + T.methods.length * 8 }); let ee = r.map(T => { u = Er(u, 4); let P = u; return T.offset = P, u += 4 + 2 * T.types.length, P }), re = l.map(T => { u = Er(u, 4); let P = u; return T.offset = P, u += 4 + 2 * T.types.length, P }), ce = [], Y = f.map(T => { let P = u, z = m.from(ye(T.length)), Z = m.from(T, "utf8"), W = m.concat([z, Z, du]); return ce.push(W), u += W.length, P }), ae = V.map(T => { let P = u; return u += li.length, P }), X = d.map(T => { let P = fu(T); return T.offset = u, u += P.length, P }), oe = n.map((T, P) => { T.classData.offset = u; let z = pu(T); return u += z.length, z }), Ce = 0, rt = 0; u = Er(u, 4); let H = u, ge = r.length + l.length, Le = 4 + (o.length > 0 ? 1 : 0) + 2 + c.length + V.length + a.length + (ge > 0 ? 1 : 0) + 1 + ae.length + d.length + n.length + 1, De = 4 + Le * ai; u += De; let Oe = u - B, He = u, I = m.alloc(He); I.write(`dex
035`), I.writeUInt32LE(He, 32), I.writeUInt32LE(E, 36), I.writeUInt32LE(Jd, 40), I.writeUInt32LE(Ce, 44), I.writeUInt32LE(rt, 48), I.writeUInt32LE(H, 52), I.writeUInt32LE(f.length, 56), I.writeUInt32LE(C, 60), I.writeUInt32LE(p.length, 64), I.writeUInt32LE(M, 68), I.writeUInt32LE(s.length, 72), I.writeUInt32LE(k, 76), I.writeUInt32LE(o.length, 80), I.writeUInt32LE(o.length > 0 ? S : 0, 84), I.writeUInt32LE(i.length, 88), I.writeUInt32LE(j, 92), I.writeUInt32LE(n.length, 96), I.writeUInt32LE(R, 100), I.writeUInt32LE(Oe, 104), I.writeUInt32LE(B, 108), Y.forEach((T, P) => { I.writeUInt32LE(T, C + P * si) }), p.forEach((T, P) => { I.writeUInt32LE(T, M + P * ii) }), s.forEach((T, P) => { let [z, Z, W] = T, q = k + P * ni; I.writeUInt32LE(z, q), I.writeUInt32LE(Z, q + 4), I.writeUInt32LE(W !== null ? W.offset : 0, q + 8) }), o.forEach((T, P) => { let [z, Z, W] = T, q = S + P * ri; I.writeUInt16LE(z, q), I.writeUInt16LE(Z, q + 2), I.writeUInt32LE(W, q + 4) }), i.forEach((T, P) => { let [z, Z, W] = T, q = j + P * oi; I.writeUInt16LE(z, q), I.writeUInt16LE(Z, q + 2), I.writeUInt32LE(W, q + 4) }), n.forEach((T, P) => { let { interfaces: z, annotationsDirectory: Z } = T, W = z !== null ? z.offset : 0, q = Z !== null ? Z.offset : 0, ot = 0, Ee = R + P * ti; I.writeUInt32LE(T.index, Ee), I.writeUInt32LE(T.accessFlags, Ee + 4), I.writeUInt32LE(T.superClassIndex, Ee + 8), I.writeUInt32LE(W, Ee + 12), I.writeUInt32LE(T.sourceFileIndex, Ee + 16), I.writeUInt32LE(q, Ee + 20), I.writeUInt32LE(T.classData.offset, Ee + 24), I.writeUInt32LE(ot, Ee + 28) }), c.forEach((T, P) => { let { items: z } = T, Z = F[P]; I.writeUInt32LE(z.length, Z), z.forEach((W, q) => { I.writeUInt32LE(W.offset, Z + 4 + q * 4) }) }), V.forEach((T, P) => { let { offset: z, superConstructor: Z } = T, W = 1, q = 1, ot = 1, Ee = 0, It = 4; I.writeUInt16LE(W, z), I.writeUInt16LE(q, z + 2), I.writeUInt16LE(ot, z + 4), I.writeUInt16LE(Ee, z + 6), I.writeUInt32LE(ae[P], z + 8), I.writeUInt32LE(It, z + 12), I.writeUInt16LE(4208, z + 16), I.writeUInt16LE(Z, z + 18), I.writeUInt16LE(0, z + 20), I.writeUInt16LE(14, z + 22) }), a.forEach(T => { let P = T.offset, z = 0, Z = 0, W = T.methods.length, q = 0; I.writeUInt32LE(z, P), I.writeUInt32LE(Z, P + 4), I.writeUInt32LE(W, P + 8), I.writeUInt32LE(q, P + 12), T.methods.forEach((ot, Ee) => { let It = P + 16 + Ee * 8, [Ui, Bi] = ot; I.writeUInt32LE(Ui, It), I.writeUInt32LE(Bi.offset, It + 4) }) }), r.forEach((T, P) => { let z = ee[P]; I.writeUInt32LE(T.types.length, z), T.types.forEach((Z, W) => { I.writeUInt16LE(Z, z + 4 + W * 2) }) }), l.forEach((T, P) => { let z = re[P]; I.writeUInt32LE(T.types.length, z), T.types.forEach((Z, W) => { I.writeUInt16LE(Z, z + 4 + W * 2) }) }), ce.forEach((T, P) => { T.copy(I, Y[P]) }), ae.forEach(T => { li.copy(I, T) }), X.forEach((T, P) => { T.copy(I, d[P].offset) }), oe.forEach((T, P) => { T.copy(I, n[P].classData.offset) }), I.writeUInt32LE(Le, H); let de = [[Gd, 1, _], [$d, f.length, C], [Hd, p.length, M], [Zd, s.length, k]]; o.length > 0 && de.push([qd, o.length, S]), de.push([Wd, i.length, j]), de.push([Kd, n.length, R]), c.forEach((T, P) => { de.push([Xd, T.items.length, F[P]]) }), V.forEach(T => { de.push([tu, 1, T.offset]) }), a.forEach(T => { de.push([iu, 1, T.offset]) }), ge > 0 && de.push([Yd, ge, ee.concat(re)[0]]), de.push([nu, f.length, Y[0]]), ae.forEach(T => { de.push([ru, 1, T]) }), d.forEach(T => { de.push([ou, 1, T.offset]) }), n.forEach(T => { de.push([eu, 1, T.classData.offset]) }), de.push([Qd, 1, H]), de.forEach((T, P) => { let [z, Z, W] = T, q = H + 4 + P * ai; I.writeUInt16LE(z, q), I.writeUInt32LE(Z, q + 4), I.writeUInt32LE(W, q + 8) }); let Ur = new Checksum("sha1"); return Ur.update(I.slice(g + b)), m.from(Ur.getDigest()).copy(I, g), I.writeUInt32LE(Eu(I, g), h), I
    }
  }; di = uu
}); function fi(t) { wr = t } function Ir(t, e, n) { let r = et(t); return r === null && (t.indexOf("[") === 0 ? r = Cr(t, e, n) : (t[0] === "L" && t[t.length - 1] === ";" && (t = t.substring(1, t.length - 1)), r = wu(t, e, n))), Object.assign({ className: t }, r) } function et(t) { let e = hi[t]; return e !== void 0 ? e : null } function wu(t, e, n) { let r = n._types[e ? 1 : 0], o = r[t]; return o !== void 0 || (t === "java.lang.Object" ? o = Iu(n) : o = Cu(t, e, n), r[t] = o), o } function Iu(t) { return { name: "Ljava/lang/Object;", type: "pointer", size: 1, defaultValue: NULL, isCompatible(e) { return e === null ? !0 : e === void 0 ? !1 : e.$h instanceof NativePointer ? !0 : typeof e == "string" }, fromJni(e, n, r) { return e.isNull() ? null : t.cast(e, t.use("java.lang.Object"), r) }, toJni(e, n) { return e === null ? NULL : typeof e == "string" ? n.newStringUtf(e) : e.$h } } } function Cu(t, e, n) { let r = null, o = null, i = null; function s() { return r === null && (r = n.use(t).class), r } function l(c) { let d = s(); return o === null && (o = d.isInstance.overload("java.lang.Object")), o.call(d, c) } function a() { if (i === null) { let c = s(); i = n.use("java.lang.String").class.isAssignableFrom(c) } return i } return { name: Ge(t), type: "pointer", size: 1, defaultValue: NULL, isCompatible(c) { return c === null ? !0 : c === void 0 ? !1 : c.$h instanceof NativePointer ? l(c) : typeof c == "string" && a() }, fromJni(c, d, p) { return c.isNull() ? null : a() && e ? d.stringFromJni(c) : n.cast(c, n.use(t), p) }, toJni(c, d) { return c === null ? NULL : typeof c == "string" ? d.newStringUtf(c) : c.$h }, toString() { return this.name } } } function Au(t, e) { let n = y.prototype, r = Mu(e), o = { typeName: e, newArray: n["new" + r + "Array"], setRegion: n["set" + r + "ArrayRegion"], getElements: n["get" + r + "ArrayElements"], releaseElements: n["release" + r + "ArrayElements"] }; return { name: t, type: "pointer", size: 1, defaultValue: NULL, isCompatible(i) { return ku(i, e) }, fromJni(i, s, l) { return Lu(i, o, s, l) }, toJni(i, s) { return Nu(i, o, s) } } } function Cr(t, e, n) { let r = Tu[t]; if (r !== void 0) return r; if (t.indexOf("[") !== 0) throw new Error("Unsupported type: " + t); let o = t.substring(1), i = Ir(o, e, n), s = 0, l = o.length; for (; s !== l && o[s] === "[";)s++; o = o.substring(s), o[0] === "L" && o[o.length - 1] === ";" && (o = o.substring(1, o.length - 1)); let a = o.replace(/\./g, "/"); Su.has(a) ? a = "[".repeat(s) + a : a = "[".repeat(s) + "L" + a + ";"; let c = "[" + a; return o = "[".repeat(s) + o, { name: t.replace(/\./g, "/"), type: "pointer", size: 1, defaultValue: NULL, isCompatible(d) { return d === null ? !0 : typeof d != "object" || d.length === void 0 ? !1 : d.every(function (p) { return i.isCompatible(p) }) }, fromJni(d, p, f) { if (d.isNull()) return null; let u = [], _ = p.getArrayLength(d); for (let h = 0; h !== _; h++) { let g = p.getObjectArrayElement(d, h); try { u.push(i.fromJni(g, p)) } finally { p.deleteLocalRef(g) } } try { u.$w = n.cast(d, n.use(c), f) } catch { n.use("java.lang.reflect.Array").newInstance(n.use(o).class, 0), u.$w = n.cast(d, n.use(c), f) } return u.$dispose = xu, u }, toJni(d, p) { if (d === null) return NULL; if (!(d instanceof Array)) throw new Error("Expected an array"); let f = d.$w; if (f !== void 0) return f.$h; let u = d.length, h = n.use(o).$borrowClassHandle(p); try { let g = p.newObjectArray(u, h.value, NULL); p.throwIfExceptionPending(); for (let b = 0; b !== u; b++) { let E = i.toJni(d[b], p); try { p.setObjectArrayElement(g, b, E) } finally { i.type === "pointer" && p.getObjectRefType(E) === vu && p.deleteLocalRef(E) } p.throwIfExceptionPending() } return g } finally { h.unref(p) } } } } function xu() { let t = this.length; for (let e = 0; e !== t; e++) { let n = this[e]; if (n === null) continue; let r = n.$dispose; if (r === void 0) break; r.call(n) } this.$w.$dispose() } function Lu(t, e, n, r) { if (t.isNull()) return null; let o = et(e.typeName), i = n.getArrayLength(t); return new Zt(t, e, o, i, n, r) } function Nu(t, e, n) { if (t === null) return NULL; let r = t.$h; if (r !== void 0) return r; let o = t.length, i = et(e.typeName), s = e.newArray.call(n, o); if (s.isNull()) throw new Error("Unable to construct array"); if (o > 0) { let l = i.byteSize, a = i.write, c = i.toJni, d = Memory.alloc(o * i.byteSize); for (let p = 0; p !== o; p++)a(d.add(p * l), c(t[p])); e.setRegion.call(n, s, 0, o, d), n.throwIfExceptionPending() } return s } function ku(t, e) { if (t === null) return !0; if (t instanceof Zt) return t.$s.typeName === e; if (!(typeof t == "object" && t.length !== void 0)) return !1; let r = et(e); return Array.prototype.every.call(t, o => r.isCompatible(o)) } function Zt(t, e, n, r, o, i = !0) { if (i) { let s = o.newGlobalRef(t); this.$h = s, this.$r = Script.bindWeak(this, o.vm.makeHandleDestructor(s)) } else this.$h = t, this.$r = null; return this.$s = e, this.$t = n, this.length = r, new Proxy(this, pi) } function Ge(t) { return "L" + t.replace(/\./g, "/") + ";" } function Mu(t) { return t.charAt(0).toUpperCase() + t.slice(1) } function Ie(t) { return t } var vu, wr, pi, hi, Su, Tu, Tr = te(() => { U(); lt(); vu = 1, wr = null, pi = null; hi = { boolean: { name: "Z", type: "uint8", size: 1, byteSize: 1, defaultValue: !1, isCompatible(t) { return typeof t == "boolean" }, fromJni(t) { return !!t }, toJni(t) { return t ? 1 : 0 }, read(t) { return t.readU8() }, write(t, e) { t.writeU8(e) }, toString() { return this.name } }, byte: { name: "B", type: "int8", size: 1, byteSize: 1, defaultValue: 0, isCompatible(t) { return Number.isInteger(t) && t >= -128 && t <= 127 }, fromJni: Ie, toJni: Ie, read(t) { return t.readS8() }, write(t, e) { t.writeS8(e) }, toString() { return this.name } }, char: { name: "C", type: "uint16", size: 1, byteSize: 2, defaultValue: 0, isCompatible(t) { if (typeof t != "string" || t.length !== 1) return !1; let e = t.charCodeAt(0); return e >= 0 && e <= 65535 }, fromJni(t) { return String.fromCharCode(t) }, toJni(t) { return t.charCodeAt(0) }, read(t) { return t.readU16() }, write(t, e) { t.writeU16(e) }, toString() { return this.name } }, short: { name: "S", type: "int16", size: 1, byteSize: 2, defaultValue: 0, isCompatible(t) { return Number.isInteger(t) && t >= -32768 && t <= 32767 }, fromJni: Ie, toJni: Ie, read(t) { return t.readS16() }, write(t, e) { t.writeS16(e) }, toString() { return this.name } }, int: { name: "I", type: "int32", size: 1, byteSize: 4, defaultValue: 0, isCompatible(t) { return Number.isInteger(t) && t >= -2147483648 && t <= 2147483647 }, fromJni: Ie, toJni: Ie, read(t) { return t.readS32() }, write(t, e) { t.writeS32(e) }, toString() { return this.name } }, long: { name: "J", type: "int64", size: 2, byteSize: 8, defaultValue: 0, isCompatible(t) { return typeof t == "number" || t instanceof Int64 }, fromJni: Ie, toJni: Ie, read(t) { return t.readS64() }, write(t, e) { t.writeS64(e) }, toString() { return this.name } }, float: { name: "F", type: "float", size: 1, byteSize: 4, defaultValue: 0, isCompatible(t) { return typeof t == "number" }, fromJni: Ie, toJni: Ie, read(t) { return t.readFloat() }, write(t, e) { t.writeFloat(e) }, toString() { return this.name } }, double: { name: "D", type: "double", size: 2, byteSize: 8, defaultValue: 0, isCompatible(t) { return typeof t == "number" }, fromJni: Ie, toJni: Ie, read(t) { return t.readDouble() }, write(t, e) { t.writeDouble(e) }, toString() { return this.name } }, void: { name: "V", type: "void", size: 0, byteSize: 0, defaultValue: void 0, isCompatible(t) { return t === void 0 }, fromJni() { }, toJni() { return NULL }, toString() { return this.name } } }, Su = new Set(Object.values(hi).map(t => t.name)); Tu = [["Z", "boolean"], ["B", "byte"], ["C", "char"], ["D", "double"], ["F", "float"], ["I", "int"], ["J", "long"], ["S", "short"]].reduce((t, [e, n]) => (t["[" + e] = Au("[" + e, n), t), {}); pi = { has(t, e) { return e in t ? !0 : t.tryParseIndex(e) !== null }, get(t, e, n) { let r = t.tryParseIndex(e); return r === null ? t[e] : t.readElement(r) }, set(t, e, n, r) { let o = t.tryParseIndex(e); return o === null ? (t[e] = n, !0) : (t.writeElement(o, n), !0) }, ownKeys(t) { let e = [], { length: n } = t; for (let r = 0; r !== n; r++) { let o = r.toString(); e.push(o) } return e.push("length"), e }, getOwnPropertyDescriptor(t, e) { return t.tryParseIndex(e) !== null ? { writable: !0, configurable: !0, enumerable: !0 } : Object.getOwnPropertyDescriptor(t, e) } }; Object.defineProperties(Zt.prototype, { $dispose: { enumerable: !0, value() { let t = this.$r; t !== null && (this.$r = null, Script.unbindWeak(t)) } }, $clone: { value(t) { return new Zt(this.$h, this.$s, this.$t, this.length, t) } }, tryParseIndex: { value(t) { if (typeof t == "symbol") return null; let e = parseInt(t); return isNaN(e) || e < 0 || e >= this.length ? null : e } }, readElement: { value(t) { return this.withElements(e => { let n = this.$t; return n.fromJni(n.read(e.add(t * n.byteSize))) }) } }, writeElement: { value(t, e) { let { $h: n, $s: r, $t: o } = this, i = wr.getEnv(), s = Memory.alloc(o.byteSize); o.write(s, o.toJni(e)), r.setRegion.call(i, n, t, 1, s) } }, withElements: { value(t) { let { $h: e, $s: n } = this, r = wr.getEnv(), o = n.getElements.call(r, e); if (o.isNull()) throw new Error("Unable to get array elements"); try { return t(o) } finally { n.releaseElements.call(r, e, o) } } }, toJSON: { value() { let { length: t, $t: e } = this, { byteSize: n, fromJni: r, read: o } = e; return this.withElements(i => { let s = []; for (let l = 0; l !== t; l++) { let a = r(o(i.add(l * n))); s.push(a) } return s }) } }, toString: { value() { return this.toJSON().toString() } } }) }); function Ru() { return function (t, e, n, r) { return Rr.call(this, t, e, n, r) } } function Rr(t, e, n, r = !0) { if (t !== null) if (r) { let o = n.newGlobalRef(t); this.$h = o, this.$r = Script.bindWeak(this, $.makeHandleDestructor(o)) } else this.$h = t, this.$r = null; else this.$h = null, this.$r = null; return this.$t = e, new Proxy(this, Ii) } function Pr(t, e) { this.value = e.newGlobalRef(t), e.deleteLocalRef(t), this.refs = 1 } function Pu(t, e) { t.unref(e) } function Fu(t) { let e = t.replace(/\./g, "/"); return function (n) { let r = Kt(); Ni(r); try { return n.findClass(e) } finally { ki(r) } } } function Du(t, e, n) { return xr === null && (bi = n.vaMethod("pointer", ["pointer"]), xr = e.loadClass.overload("java.lang.String").handle), n = null, function (r) { let o = r.newStringUtf(t), i = Kt(); Ni(i); try { let s = bi(r.handle, e.$h, xr, o); return r.throwIfExceptionPending(), s } finally { ki(i), r.deleteLocalRef(o) } } } function Uu(t) { return function (e) { let n = t.$borrowClassHandle(e); try { return e.getSuperclass(n.value) } finally { n.unref(e) } } } function Bu(t, e, n) { let { $n: r, $f: o } = e, i = tp(r), s = n.javaLangClass(), l = n.javaLangReflectConstructor(), a = n.vaMethod("pointer", []), c = n.vaMethod("uint8", []), d = [], p = [], f = o._getType(r, !1), u = o._getType("void", !1), _ = a(n.handle, t, s.getDeclaredConstructors); try { let h = n.getArrayLength(_); if (h !== 0) for (let g = 0; g !== h; g++) { let b, E, C = n.getObjectArrayElement(_, g); try { b = n.fromReflectedMethod(C), E = a(n.handle, C, l.getGenericParameterTypes) } finally { n.deleteLocalRef(C) } let A; try { A = Or(n, E).map(M => o._getType(M)) } finally { n.deleteLocalRef(E) } d.push(tt(i, e, Lr, b, f, A, n)), p.push(tt(i, e, je, b, u, A, n)) } else { if (c(n.handle, t, s.isInterface)) throw new Error("cannot instantiate an interface"); let b = n.javaLangObject(), E = n.getMethodId(b, "<init>", "()V"); d.push(tt(i, e, Lr, E, f, [], n)), p.push(tt(i, e, je, E, u, [], n)) } } finally { n.deleteLocalRef(_) } if (p.length === 0) throw new Error("no supported overloads"); return { allocAndInit: kr(d), initOnly: kr(p) } } function zu(t, e, n, r, o) { return e.startsWith("m") ? Vu(t, e, n, r, o) : Qu(t, e, n, r, o) } function Vu(t, e, n, r, o) { let { $f: i } = r, s = e.split(":").slice(1), l = o.javaLangReflectMethod(), a = o.vaMethod("pointer", []), c = o.vaMethod("uint8", []), d = s.map(f => { let u = f[0] === "s" ? wt : je, _ = ptr(f.substr(1)), h, g = [], b = o.toReflectedMethod(n, _, u === wt ? 1 : 0); try { let E = !!c(o.handle, b, l.isVarArgs), C = a(o.handle, b, l.getGenericReturnType); o.throwIfExceptionPending(); try { h = i._getType(o.getTypeName(C)) } finally { o.deleteLocalRef(C) } let A = a(o.handle, b, l.getParameterTypes); try { let M = o.getArrayLength(A); for (let O = 0; O !== M; O++) { let k = o.getObjectArrayElement(A, O), N; try { N = E && O === M - 1 ? o.getArrayTypeName(k) : o.getTypeName(k) } finally { o.deleteLocalRef(k) } let S = i._getType(N); g.push(S) } } finally { o.deleteLocalRef(A) } } catch { return null } finally { o.deleteLocalRef(b) } return tt(t, r, u, _, h, g, o) }).filter(f => f !== null); if (d.length === 0) throw new Error("No supported overloads"); t === "valueOf" && qu(d); let p = kr(d); return function (f) { return p } } function kr(t) { let e = Ju(); return Object.setPrototypeOf(e, Ci), e._o = t, e } function Ju() { let t = function () { return t.invoke(this, arguments) }; return t } function yi(t, e, n) { return `${e.className} ${t}(${n.map(r => r.className).join(", ")})` } function $e(t) { let e = t._o; e.length > 1 && Mr(e[0].methodName, e, "has more than one overload, use .overload(<signature>) to choose from:") } function Mr(t, e, n) {
  let o = e.slice().sort((i, s) => i.argumentTypes.length - s.argumentTypes.length).map(i => i.argumentTypes.length > 0 ? ".overload('" + i.argumentTypes.map(l => l.className).join("', '") + "')" : ".overload()"); throw new Error(`${t}(): ${n}
	${o.join(`
	`)}`)
} function tt(t, e, n, r, o, i, s, l) { let a = o.type, c = i.map(f => f.type); s === null && (s = $.getEnv()); let d, p; return n === je ? (d = s.vaMethod(a, c, l), p = s.nonvirtualVaMethod(a, c, l)) : n === wt ? (d = s.staticVaMethod(a, c, l), p = d) : (d = s.constructor(c, l), p = d), Gu([t, e, n, r, o, i, d, p]) } function Gu(t) { let e = $u(); return Object.setPrototypeOf(e, Ti), e._p = t, e } function $u() { let t = function () { return t.invoke(this, arguments) }; return t } function xi(t, e, n, r, o, i, s = null) { let l = new Set, a = Hu([t, e, n, r, o, i, s, l]), c = new NativeCallback(a, r.type, ["pointer", "pointer"].concat(o.map(d => d.type))); return c._c = l, c } function Hu(t) { return function () { return Zu(arguments, t) } } function Zu(t, e) { let n = new y(t[0], $), [r, o, i, s, l, a, c, d] = e, p = [], f; if (i === je) { let h = o.$C; f = new h(t[1], qt, n, !1) } else f = o; let u = Kt(); n.pushLocalFrame(3); let _ = !0; $.link(u, n); try { d.add(u); let h; c === null || !nt.has(u) ? h = a : h = c; let g = [], b = t.length - 2; for (let A = 0; A !== b; A++) { let O = l[A].fromJni(t[2 + A], n, !1); g.push(O), p.push(O) } let E = h.apply(f, g); if (!s.isCompatible(E)) throw new Error(`Implementation for ${r} expected return value compatible with ${s.className}`); let C = s.toJni(E, n); return s.type === "pointer" && (C = n.popLocalFrame(C), _ = !1, p.push(E)), C } catch (h) { let g = h.$h; return g !== void 0 ? n.throw(g) : Script.nextTick(() => { throw h }), s.defaultValue } finally { $.unlink(u), _ && n.popLocalFrame(NULL), d.delete(u), p.forEach(h => { if (h === null) return; let g = h.$dispose; g !== void 0 && g.call(h) }) } } function qu(t) { let { holder: e, type: n } = t[0]; t.some(o => o.type === n && o.argumentTypes.length === 0) || t.push(Wu([e, n])) } function Wu(t) { let e = Ku(); return Object.setPrototypeOf(e, Ai), e._p = t, e } function Ku() { return function () { return this } } function Qu(t, e, n, r, o) { let i = e[2] === "s" ? Ar : Nr, s = ptr(e.substr(3)), { $f: l } = r, a, c = o.toReflectedField(n, s, i === Ar ? 1 : 0); try { a = o.vaMethod("pointer", [])(o.handle, c, o.javaLangReflectField().getGenericType), o.throwIfExceptionPending() } finally { o.deleteLocalRef(c) } let d; try { d = l._getType(o.getTypeName(a)) } finally { o.deleteLocalRef(a) } let p, f, u = d.type; return i === Ar ? (p = o.getStaticField(u), f = o.setStaticField(u)) : (p = o.getField(u), f = o.setField(u)), Yu([i, d, s, p, f]) } function Yu(t) { return function (e) { return new Li([e].concat(t)) } } function Li(t) { this._p = t } function Ei(t) { let { cacheDir: e, tempFileNaming: n } = t, r = t.use("java.io.File"), o = r.$new(e); return o.mkdirs(), r.createTempFile(n.prefix, n.suffix + ".dex", o) } function Xu(t, e) { e.use("java.io.File").$new(t).setWritable(!1, !1) } function ep() { switch (he.state) { case "empty": { he.state = "pending"; let t = he.factories[0], e = t.use("java.util.HashMap"), n = t.use("java.lang.Integer"); he.loaders = e.$new(), he.Integer = n; let r = t.loader; return r !== null && jr(t, r), he.state = "ready", he } case "pending": do Thread.sleep(.05); while (he.state === "pending"); return he; case "ready": return he } } function jr(t, e) { let { factories: n, loaders: r, Integer: o } = he, i = o.$new(n.indexOf(t)); r.put(e, i); for (let s = e.getParent(); s !== null && !r.containsKey(s); s = s.getParent())r.put(s, i) } function Ni(t) { let e = nt.get(t); e === void 0 && (e = 0), e++, nt.set(t, e) } function ki(t) { let e = nt.get(t); if (e === void 0) throw new Error(`Thread ${t} is not ignored`); e--, e === 0 ? nt.delete(t) : nt.set(t, e) } function tp(t) { return t.slice(t.lastIndexOf(".") + 1) } function Or(t, e) { let n = [], r = t.getArrayLength(e); for (let o = 0; o !== r; o++) { let i = t.getObjectArrayElement(e, o); try { n.push(t.getTypeName(i)) } finally { t.deleteLocalRef(i) } } return n } function np(t) { let e = t.split("."); return e[e.length - 1] + ".java" } var ju, _i, vi, Ou, Lr, wt, je, Ar, Nr, qt, Si, mi, gi, Kt, St, he, $, Q, wi, Ii, Ci, Ti, Ai, bi, xr, nt, Pe, Wt, Mi = te(() => {
  U(); lt(); gt(); mr(); br(); Xo(); ui(); Tr(); ju = 4, { ensureClassInitialized: _i, makeMethodMangler: vi } = $t, Ou = 8, Lr = 1, wt = 2, je = 3, Ar = 1, Nr = 2, qt = 1, Si = 2, mi = Symbol("PENDING_USE"), gi = "/data/local/tmp", { getCurrentThreadId: Kt, pointerSize: St } = Process, he = { state: "empty", factories: [], loaders: null, Integer: null }, $ = null, Q = null, wi = null, Ii = null, Ci = null, Ti = null, Ai = null, bi = null, xr = null, nt = new Map, Pe = class t { static _initialize(e, n) { $ = e, Q = n, wi = n.flavor === "art", n.flavor === "jvm" && (_i = Ho, vi = qo) } static _disposeAll(e) { he.factories.forEach(n => { n._dispose(e) }) } static get(e) { let n = ep(), r = n.factories[0]; if (e === null) return r; let o = n.loaders.get(e); if (o !== null) { let s = r.cast(o, n.Integer); return n.factories[s.intValue()] } let i = new t; return i.loader = e, i.cacheDir = r.cacheDir, jr(i, e), i } constructor() { this.cacheDir = gi, this.codeCacheDir = gi + "/dalvik-cache", this.tempFileNaming = { prefix: "frida", suffix: "" }, this._classes = {}, this._classHandles = new Et(10, Pu), this._patchedMethods = new Set, this._loader = null, this._types = [{}, {}], he.factories.push(this) } _dispose(e) { Array.from(this._patchedMethods).forEach(n => { n.implementation = null }), this._patchedMethods.clear(), sr(), this._classHandles.dispose(e), this._classes = {} } get loader() { return this._loader } set loader(e) { let n = this._loader === null && e !== null; this._loader = e, n && he.state === "ready" && this === he.factories[0] && jr(this, e) } use(e, n = {}) { let r = n.cache !== "skip", o = r ? this._getUsedClass(e) : void 0; if (o === void 0) try { let i = $.getEnv(), { _loader: s } = this, l = s !== null ? Du(e, s, i) : Fu(e); o = this._make(e, l, i) } finally { r && this._setUsedClass(e, o) } return o } _getUsedClass(e) { let n; for (; (n = this._classes[e]) === mi;)Thread.sleep(.05); return n === void 0 && (this._classes[e] = mi), n } _setUsedClass(e, n) { n !== void 0 ? this._classes[e] = n : delete this._classes[e] } _make(e, n, r) { let o = Ru(), i = Object.create(Rr.prototype, { [Symbol.for("n")]: { value: e }, $n: { get() { return this[Symbol.for("n")] } }, [Symbol.for("C")]: { value: o }, $C: { get() { return this[Symbol.for("C")] } }, [Symbol.for("w")]: { value: null, writable: !0 }, $w: { get() { return this[Symbol.for("w")] }, set(a) { this[Symbol.for("w")] = a } }, [Symbol.for("_s")]: { writable: !0 }, $_s: { get() { return this[Symbol.for("_s")] }, set(a) { this[Symbol.for("_s")] = a } }, [Symbol.for("c")]: { value: [null] }, $c: { get() { return this[Symbol.for("c")] } }, [Symbol.for("m")]: { value: new Map }, $m: { get() { return this[Symbol.for("m")] } }, [Symbol.for("l")]: { value: null, writable: !0 }, $l: { get() { return this[Symbol.for("l")] }, set(a) { this[Symbol.for("l")] = a } }, [Symbol.for("gch")]: { value: n }, $gch: { get() { return this[Symbol.for("gch")] } }, [Symbol.for("f")]: { value: this }, $f: { get() { return this[Symbol.for("f")] } } }); o.prototype = i; let s = new o(null); i[Symbol.for("w")] = s, i.$w = s; let l = s.$borrowClassHandle(r); try { let a = l.value; _i(r, a), i.$l = Je.build(a, r) } finally { l.unref(r) } return s } retain(e) { let n = $.getEnv(); return e.$clone(n) } cast(e, n, r) { let o = $.getEnv(), i = e.$h; i === void 0 && (i = e); let s = n.$borrowClassHandle(o); try { if (!o.isInstanceOf(i, s.value)) throw new Error(`Cast from '${o.getObjectClassName(i)}' to '${n.$n}' isn't possible`) } finally { s.unref(o) } let l = n.$C; return new l(i, qt, o, r) } wrap(e, n, r) { let o = n.$C, i = new o(e, qt, r, !1); return i.$r = Script.bindWeak(i, $.makeHandleDestructor(e)), i } array(e, n) { let r = $.getEnv(), o = et(e); o !== null && (e = o.name); let i = Cr("[" + e, !1, this), s = i.toJni(n, r); return i.fromJni(s, r, !0) } registerClass(e) { let n = $.getEnv(), r = []; try { let o = this.use("java.lang.Class"), i = n.javaLangReflectMethod(), s = n.vaMethod("pointer", []), l = e.name, a = e.implements || [], c = e.superClass || this.use("java.lang.Object"), d = [], p = [], f = { name: Ge(l), sourceFileName: np(l), superClass: Ge(c.$n), interfaces: a.map(S => Ge(S.$n)), fields: d, methods: p }, u = a.slice(); a.forEach(S => { Array.prototype.slice.call(S.class.getInterfaces()).forEach(x => { let j = this.cast(x, o).getCanonicalName(); u.push(this.use(j)) }) }); let _ = e.fields || {}; Object.getOwnPropertyNames(_).forEach(S => { let x = this._getType(_[S]); d.push([S, x.name]) }); let h = {}, g = {}; u.forEach(S => { let x = S.$borrowClassHandle(n); r.push(x); let j = x.value; S.$ownMembers.filter(w => S[w].overloads !== void 0).forEach(w => { let R = S[w], D = R.overloads, B = D.map(F => yi(w, F.returnType, F.argumentTypes)); h[w] = [R, B, j], D.forEach((F, V) => { let ee = B[V]; g[ee] = [F, j] }) }) }); let b = e.methods || {}, C = Object.keys(b).reduce((S, x) => { let j = b[x], w = x === "$init" ? "<init>" : x; return j instanceof Array ? S.push(...j.map(R => [w, R])) : S.push([w, j]), S }, []), A = []; C.forEach(([S, x]) => { let j = je, w, R, D = [], B; if (typeof x == "function") { let re = h[S]; if (re !== void 0 && Array.isArray(re)) { let [ce, Y, ae] = re; if (Y.length > 1) throw new Error(`More than one overload matching '${S}': signature must be specified`); delete g[Y[0]]; let X = ce.overloads[0]; j = X.type, w = X.returnType, R = X.argumentTypes, B = x; let oe = n.toReflectedMethod(ae, X.handle, 0), Ce = s(n.handle, oe, i.getGenericExceptionTypes); D = Or(n, Ce).map(Ge), n.deleteLocalRef(Ce), n.deleteLocalRef(oe) } else w = this._getType("void"), R = [], B = x } else { if (x.isStatic && (j = wt), w = this._getType(x.returnType || "void"), R = (x.argumentTypes || []).map(Y => this._getType(Y)), B = x.implementation, typeof B != "function") throw new Error("Expected a function implementation for method: " + S); let re = yi(S, w, R), ce = g[re]; if (ce !== void 0) { let [Y, ae] = ce; delete g[re], j = Y.type, w = Y.returnType, R = Y.argumentTypes; let X = n.toReflectedMethod(ae, Y.handle, 0), oe = s(n.handle, X, i.getGenericExceptionTypes); D = Or(n, oe).map(Ge), n.deleteLocalRef(oe), n.deleteLocalRef(X) } } let F = w.name, V = R.map(re => re.name), ee = "(" + V.join("") + ")" + F; p.push([S, F, V, D, j === wt ? Ou : 0]), A.push([S, ee, j, w, R, B]) }); let M = Object.keys(g); if (M.length > 0) throw new Error("Missing implementation for: " + M.join(", ")); let O = Wt.fromBuffer(di(f), this); try { O.load() } finally { O.file.delete() } let k = this.use(e.name), N = C.length; if (N > 0) { let S = 3 * St, x = Memory.alloc(N * S), j = [], w = []; A.forEach(([B, F, V, ee, re, ce], Y) => { let ae = Memory.allocUtf8String(B), X = Memory.allocUtf8String(F), oe = xi(B, k, V, ee, re, ce); x.add(Y * S).writePointer(ae), x.add(Y * S + St).writePointer(X), x.add(Y * S + 2 * St).writePointer(oe), w.push(ae, X), j.push(oe) }); let R = k.$borrowClassHandle(n); r.push(R); let D = R.value; n.registerNatives(D, x, N), n.throwIfExceptionPending(), k.$nativeMethods = j } return k } finally { r.forEach(o => { o.unref(n) }) } } choose(e, n) { let r = $.getEnv(), { flavor: o } = Q; if (o === "jvm") this._chooseObjectsJvm(e, r, n); else if (o === "art") { let i = Q["art::gc::Heap::VisitObjects"] === void 0; if (i && Q["art::gc::Heap::GetInstances"] === void 0) return this._chooseObjectsJvm(e, r, n); Se($, r, s => { i ? this._chooseObjectsArtPreA12(e, r, s, n) : this._chooseObjectsArtLegacy(e, r, s, n) }) } else this._chooseObjectsDalvik(e, r, n) } _chooseObjectsJvm(e, n, r) { let o = this.use(e), { jvmti: i } = Q, s = 1, l = 3, a = o.$borrowClassHandle(n), c = int64(a.value.toString()); try { let d = new NativeCallback((b, E, C, A) => (C.writeS64(c), s), "int", ["int64", "int64", "pointer", "pointer"]); i.iterateOverInstancesOfClass(a.value, l, d, a.value); let p = Memory.alloc(8); p.writeS64(c); let f = Memory.alloc(ju), u = Memory.alloc(St); i.getObjectsWithTags(1, p, f, u, NULL); let _ = f.readS32(), h = u.readPointer(), g = []; for (let b = 0; b !== _; b++)g.push(h.add(b * St).readPointer()); i.deallocate(h); try { for (let b of g) { let E = this.cast(b, o); if (r.onMatch(E) === "stop") break } r.onComplete() } finally { g.forEach(b => { n.deleteLocalRef(b) }) } } finally { a.unref(n) } } _chooseObjectsArtPreA12(e, n, r, o) { let i = this.use(e), s = _t.$new(r, $), l, a = i.$borrowClassHandle(n); try { let f = Q["art::JavaVMExt::DecodeGlobal"](Q.vm, r, a.value); l = s.newHandle(f) } finally { a.unref(n) } let c = 0, d = ht.$new(); Q["art::gc::Heap::GetInstances"](Q.artHeap, s, l, c, d); let p = d.handles.map(f => n.newGlobalRef(f)); d.$delete(), s.$delete(); try { for (let f of p) { let u = this.cast(f, i); if (o.onMatch(u) === "stop") break } o.onComplete() } finally { p.forEach(f => { n.deleteGlobalRef(f) }) } } _chooseObjectsArtLegacy(e, n, r, o) { let i = this.use(e), s = [], l = Q["art::JavaVMExt::AddGlobalRef"], a = Q.vm, c, d = i.$borrowClassHandle(n); try { c = Q["art::JavaVMExt::DecodeGlobal"](a, r, d.value).toInt32() } finally { d.unref(n) } let p = pr(c, f => { s.push(l(a, r, f)) }); Q["art::gc::Heap::VisitObjects"](Q.artHeap, p, NULL); try { for (let f of s) { let u = this.cast(f, i); if (o.onMatch(u) === "stop") break } } finally { s.forEach(f => { n.deleteGlobalRef(f) }) } o.onComplete() } _chooseObjectsDalvik(e, n, r) { let o = this.use(e); if (Q.addLocalReference === null) { let s = Process.getModuleByName("libdvm.so"), l; switch (Process.arch) { case "arm": l = "2d e9 f0 41 05 46 15 4e 0c 46 7e 44 11 b3 43 68"; break; case "ia32": l = "8d 64 24 d4 89 5c 24 1c 89 74 24 20 e8 ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? 85 d2"; break }Memory.scan(s.base, s.size, l, { onMatch: (a, c) => { let d; if (Process.arch === "arm") a = a.or(1), d = new NativeFunction(a, "pointer", ["pointer", "pointer"]); else { let p = Memory.alloc(Process.pageSize); Memory.patchCode(p, 16, f => { let u = new X86Writer(f, { pc: p }); u.putMovRegRegOffsetPtr("eax", "esp", 4), u.putMovRegRegOffsetPtr("edx", "esp", 8), u.putJmpAddress(a), u.flush() }), d = new NativeFunction(p, "pointer", ["pointer", "pointer"]), d._thunk = p } return Q.addLocalReference = d, $.perform(p => { i(this, p) }), "stop" }, onError(a) { }, onComplete() { Q.addLocalReference === null && r.onComplete() } }) } else i(this, n); function i(s, l) { let { DVM_JNI_ENV_OFFSET_SELF: a } = $t, c = l.handle.add(a).readPointer(), d, p = o.$borrowClassHandle(l); try { d = Q.dvmDecodeIndirectRef(c, p.value) } finally { p.unref(l) } let f = d.toMatchPattern(), u = Q.dvmHeapSourceGetBase(), h = Q.dvmHeapSourceGetLimit().sub(u).toInt32(); Memory.scan(u, h, f, { onMatch: (g, b) => { Q.dvmIsValidObject(g) && $.perform(E => { let C = E.handle.add(a).readPointer(), A, M = Q.addLocalReference(C, g); try { A = s.cast(M, o) } finally { E.deleteLocalRef(M) } if (r.onMatch(A) === "stop") return "stop" }) }, onError(g) { }, onComplete() { r.onComplete() } }) } } openClassFile(e) { return new Wt(e, null, this) } _getType(e, n = !0) { return Ir(e, n, this) } }; Ii = { has(t, e) { return e in t ? !0 : t.$has(e) }, get(t, e, n) { if (typeof e != "string" || e.startsWith("$") || e === "class") return t[e]; let r = t.$find(e); return r !== null ? r(n) : t[e] }, set(t, e, n, r) { return t[e] = n, !0 }, ownKeys(t) { return t.$list() }, getOwnPropertyDescriptor(t, e) { return Object.prototype.hasOwnProperty.call(t, e) ? Object.getOwnPropertyDescriptor(t, e) : { writable: !1, configurable: !0, enumerable: !0 } } }; Object.defineProperties(Rr.prototype, { [Symbol.for("new")]: { enumerable: !1, get() { return this.$getCtor("allocAndInit") } }, $new: { enumerable: !0, get() { return this[Symbol.for("new")] } }, [Symbol.for("alloc")]: { enumerable: !1, value() { let t = $.getEnv(), e = this.$borrowClassHandle(t); try { let n = t.allocObject(e.value); return this.$f.cast(n, this) } finally { e.unref(t) } } }, $alloc: { enumerable: !0, get() { return this[Symbol.for("alloc")] } }, [Symbol.for("init")]: { enumerable: !1, get() { return this.$getCtor("initOnly") } }, $init: { enumerable: !0, get() { return this[Symbol.for("init")] } }, [Symbol.for("dispose")]: { enumerable: !1, value() { let t = this.$r; t !== null && (this.$r = null, Script.unbindWeak(t)), this.$h !== null && (this.$h = void 0) } }, $dispose: { enumerable: !0, get() { return this[Symbol.for("dispose")] } }, [Symbol.for("clone")]: { enumerable: !1, value(t) { let e = this.$C; return new e(this.$h, this.$t, t) } }, $clone: { value(t) { return this[Symbol.for("clone")](t) } }, [Symbol.for("class")]: { enumerable: !1, get() { let t = $.getEnv(), e = this.$borrowClassHandle(t); try { let n = this.$f; return n.cast(e.value, n.use("java.lang.Class")) } finally { e.unref(t) } } }, class: { enumerable: !0, get() { return this[Symbol.for("class")] } }, [Symbol.for("className")]: { enumerable: !1, get() { let t = this.$h; return t === null ? this.$n : $.getEnv().getObjectClassName(t) } }, $className: { enumerable: !0, get() { return this[Symbol.for("className")] } }, [Symbol.for("ownMembers")]: { enumerable: !1, get() { return this.$l.list() } }, $ownMembers: { enumerable: !0, get() { return this[Symbol.for("ownMembers")] } }, [Symbol.for("super")]: { enumerable: !1, get() { let t = $.getEnv(), e = this.$s.$C; return new e(this.$h, Si, t) } }, $super: { enumerable: !0, get() { return this[Symbol.for("super")] } }, [Symbol.for("s")]: { enumerable: !1, get() { let t = Object.getPrototypeOf(this), e = t.$_s; if (e === void 0) { let n = $.getEnv(), r = this.$borrowClassHandle(n); try { let o = n.getSuperclass(r.value); if (o.isNull()) e = null; else try { let i = n.getClassName(o), s = t.$f; if (e = s._getUsedClass(i), e === void 0) try { let l = Uu(this); e = s._make(i, l, n) } finally { s._setUsedClass(i, e) } } finally { n.deleteLocalRef(o) } } finally { r.unref(n) } t.$_s = e } return e } }, $s: { get() { return this[Symbol.for("s")] } }, [Symbol.for("isSameObject")]: { enumerable: !1, value(t) { return $.getEnv().isSameObject(t.$h, this.$h) } }, $isSameObject: { value(t) { return this[Symbol.for("isSameObject")](t) } }, [Symbol.for("getCtor")]: { enumerable: !1, value(t) { let e = this.$c, n = e[0]; if (n === null) { let r = $.getEnv(), o = this.$borrowClassHandle(r); try { n = Bu(o.value, this.$w, r), e[0] = n } finally { o.unref(r) } } return n[t] } }, $getCtor: { value(t) { return this[Symbol.for("getCtor")](t) } }, [Symbol.for("borrowClassHandle")]: { enumerable: !1, value(t) { let e = this.$n, n = this.$f._classHandles, r = n.get(e); return r === void 0 && (r = new Pr(this.$gch(t), t), n.set(e, r, t)), r.ref() } }, $borrowClassHandle: { value(t) { return this[Symbol.for("borrowClassHandle")](t) } }, [Symbol.for("copyClassHandle")]: { enumerable: !1, value(t) { let e = this.$borrowClassHandle(t); try { return t.newLocalRef(e.value) } finally { e.unref(t) } } }, $copyClassHandle: { value(t) { return this[Symbol.for("copyClassHandle")](t) } }, [Symbol.for("getHandle")]: { enumerable: !1, value(t) { let e = this.$h; if (e === void 0) throw new Error("Wrapper is disposed; perhaps it was borrowed from a hook instead of calling Java.retain() to make a long-lived wrapper?"); return e } }, $getHandle: { value(t) { return this[Symbol.for("getHandle")](t) } }, [Symbol.for("list")]: { enumerable: !1, value() { let t = this.$s, e = t !== null ? t.$list() : [], n = this.$l; return Array.from(new Set(e.concat(n.list()))) } }, $list: { get() { return this[Symbol.for("list")] } }, [Symbol.for("has")]: { enumerable: !1, value(t) { if (this.$m.has(t) || this.$l.has(t)) return !0; let r = this.$s; return !!(r !== null && r.$has(t)) } }, $has: { value(t) { return this[Symbol.for("has")](t) } }, [Symbol.for("find")]: { enumerable: !1, value(t) { let e = this.$m, n = e.get(t); if (n !== void 0) return n; let o = this.$l.find(t); if (o !== null) { let s = $.getEnv(), l = this.$borrowClassHandle(s); try { n = zu(t, o, l.value, this.$w, s) } finally { l.unref(s) } return e.set(t, n), n } let i = this.$s; return i !== null ? i.$find(t) : null } }, $find: { value(t) { return this[Symbol.for("find")](t) } }, [Symbol.for("toJSON")]: { enumerable: !1, value() { let t = this.$n; if (this.$h === null) return `<class: ${t}>`; let n = this.$className; return t === n ? `<instance: ${t}>` : `<instance: ${t}, $className: ${n}>` } }, toJSON: { get() { return this[Symbol.for("toJSON")] } } }); Pr.prototype.ref = function () { return this.refs++, this }; Pr.prototype.unref = function (t) { --this.refs === 0 && t.deleteGlobalRef(this.value) }; Ci = Object.create(Function.prototype, { overloads: { enumerable: !0, get() { return this._o } }, overload: { value(...t) { let e = this._o, n = t.length, r = t.join(":"); for (let o = 0; o !== e.length; o++) { let i = e[o], { argumentTypes: s } = i; if (s.length !== n) continue; if (s.map(a => a.className).join(":") === r) return i } Mr(this.methodName, this.overloads, "specified argument types do not match any of:") } }, methodName: { enumerable: !0, get() { return this._o[0].methodName } }, holder: { enumerable: !0, get() { return this._o[0].holder } }, type: { enumerable: !0, get() { return this._o[0].type } }, handle: { enumerable: !0, get() { return $e(this), this._o[0].handle } }, implementation: { enumerable: !0, get() { return $e(this), this._o[0].implementation }, set(t) { $e(this), this._o[0].implementation = t } }, returnType: { enumerable: !0, get() { return $e(this), this._o[0].returnType } }, argumentTypes: { enumerable: !0, get() { return $e(this), this._o[0].argumentTypes } }, canInvokeWith: { enumerable: !0, get(t) { return $e(this), this._o[0].canInvokeWith } }, clone: { enumerable: !0, value(t) { return $e(this), this._o[0].clone(t) } }, invoke: { value(t, e) { let n = this._o, r = t.$h !== null; for (let o = 0; o !== n.length; o++) { let i = n[o]; if (i.canInvokeWith(e)) { if (i.type === je && !r) { let s = this.methodName; if (s === "toString") return `<class: ${t.$n}>`; throw new Error(s + ": cannot call instance method without an instance") } return i.apply(t, e) } } if (this.methodName === "toString") return `<class: ${t.$n}>`; Mr(this.methodName, this.overloads, "argument types do not match any of:") } } }); Ti = Object.create(Function.prototype, { methodName: { enumerable: !0, get() { return this._p[0] } }, holder: { enumerable: !0, get() { return this._p[1] } }, type: { enumerable: !0, get() { return this._p[2] } }, handle: { enumerable: !0, get() { return this._p[3] } }, implementation: { enumerable: !0, get() { let t = this._r; return t !== void 0 ? t : null }, set(t) { let e = this._p, n = e[1]; if (e[2] === Lr) throw new Error("Reimplementing $new is not possible; replace implementation of $init instead"); let o = this._r; if (o !== void 0 && (n.$f._patchedMethods.delete(this), o._m.revert($), this._r = void 0), t !== null) { let [i, s, l, a, c, d] = e, p = xi(i, s, l, c, d, t, this), f = vi(a); p._m = f, this._r = p, f.replace(p, l === je, d, $, Q), n.$f._patchedMethods.add(this) } } }, returnType: { enumerable: !0, get() { return this._p[4] } }, argumentTypes: { enumerable: !0, get() { return this._p[5] } }, canInvokeWith: { enumerable: !0, value(t) { let e = this._p[5]; return t.length !== e.length ? !1 : e.every((n, r) => n.isCompatible(t[r])) } }, clone: { enumerable: !0, value(t) { let e = this._p.slice(0, 6); return tt(...e, null, t) } }, invoke: { value(t, e) { let n = $.getEnv(), r = this._p, o = r[2], i = r[4], s = r[5], l = this._r, a = o === je, c = e.length, d = 2 + c; n.pushLocalFrame(d); let p = null; try { let f; a ? f = t.$getHandle() : (p = t.$borrowClassHandle(n), f = p.value); let u, _ = t.$t; l === void 0 ? u = r[3] : (u = l._m.resolveTarget(t, a, n, Q), wi && l._c.has(Kt()) && (_ = Si)); let h = [n.handle, f, u]; for (let E = 0; E !== c; E++)h.push(s[E].toJni(e[E], n)); let g; _ === qt ? g = r[6] : (g = r[7], a && h.splice(2, 0, t.$copyClassHandle(n))); let b = g.apply(null, h); return n.throwIfExceptionPending(), i.fromJni(b, n, !0) } finally { p !== null && p.unref(n), n.popLocalFrame(NULL) } } }, toString: { enumerable: !0, value() { return `function ${this.methodName}(${this.argumentTypes.map(t => t.className).join(", ")}): ${this.returnType.className}` } } }); Ai = Object.create(Function.prototype, { methodName: { enumerable: !0, get() { return "valueOf" } }, holder: { enumerable: !0, get() { return this._p[0] } }, type: { enumerable: !0, get() { return this._p[1] } }, handle: { enumerable: !0, get() { return NULL } }, implementation: { enumerable: !0, get() { return null }, set(t) { } }, returnType: { enumerable: !0, get() { let t = this.holder; return t.$f.use(t.$n) } }, argumentTypes: { enumerable: !0, get() { return [] } }, canInvokeWith: { enumerable: !0, value(t) { return t.length === 0 } }, clone: { enumerable: !0, value(t) { throw new Error("Invalid operation") } } }); Object.defineProperties(Li.prototype, {
    value: { enumerable: !0, get() { let [t, e, n, r, o] = this._p, i = $.getEnv(); i.pushLocalFrame(4); let s = null; try { let l; if (e === Nr) { if (l = t.$getHandle(), l === null) throw new Error("Cannot access an instance field without an instance") } else s = t.$borrowClassHandle(i), l = s.value; let a = o(i.handle, l, r); return i.throwIfExceptionPending(), n.fromJni(a, i, !0) } finally { s !== null && s.unref(i), i.popLocalFrame(NULL) } }, set(t) { let [e, n, r, o, , i] = this._p, s = $.getEnv(); s.pushLocalFrame(4); let l = null; try { let a; if (n === Nr) { if (a = e.$getHandle(), a === null) throw new Error("Cannot access an instance field without an instance") } else l = e.$borrowClassHandle(s), a = l.value; if (!r.isCompatible(t)) throw new Error(`Expected value compatible with ${r.className}`); let c = r.toJni(t, s); i(s.handle, a, o, c), s.throwIfExceptionPending() } finally { l !== null && l.unref(s), s.popLocalFrame(NULL) } } }, holder: { enumerable: !0, get() { return this._p[0] } }, fieldType: { enumerable: !0, get() { return this._p[1] } }, fieldReturnType: { enumerable: !0, get() { return this._p[2] } }, toString: {
      enumerable: !0, value() {
        let t = `Java.Field{holder: ${this.holder}, fieldType: ${this.fieldType}, fieldReturnType: ${this.fieldReturnType}, value: ${this.value}}`; return t.length < 200 ? t : `Java.Field{
	holder: ${this.holder},
	fieldType: ${this.fieldType},
	fieldReturnType: ${this.fieldReturnType},
	value: ${this.value},
}`.split(`
`).map(n => n.length > 200 ? n.slice(0, n.indexOf(" ") + 1) + "...," : n).join(`
`)
      }
    }
  }); Wt = class t { static fromBuffer(e, n) { let r = Ei(n), o = r.getCanonicalPath().toString(), i = new File(o, "w"); return i.write(e.buffer), i.close(), Xu(o, n), new t(o, r, n) } constructor(e, n, r) { this.path = e, this.file = n, this._factory = r } load() { let { _factory: e } = this, { codeCacheDir: n } = e, r = e.use("dalvik.system.DexClassLoader"), o = e.use("java.io.File"), i = this.file; if (i === null && (i = e.use("java.io.File").$new(this.path)), !i.exists()) throw new Error("File not found"); o.$new(n).mkdirs(), e.loader = r.$new(i.getCanonicalPath(), n, null, e.loader), $.preventDetachDueToClassLoader() } getClassNames() { let { _factory: e } = this, n = e.use("dalvik.system.DexFile"), r = Ei(e), o = n.loadDex(this.path, r.getCanonicalPath(), 0), i = [], s = o.entries(); for (; s.hasMoreElements();)i.push(s.nextElement().toString()); return i } }
}); var Pi = {}; Br(Pi, { default: () => op }); function Oi(t, e) { let n = t.use("android.os.Process"); t.loader = e.getClassLoader(), n.myUid() === n.SYSTEM_UID.value ? (t.cacheDir = "/data/system", t.codeCacheDir = "/data/dalvik-cache") : "getCodeCacheDir" in e ? (t.cacheDir = e.getCacheDir().getCanonicalPath(), t.codeCacheDir = e.getCodeCacheDir().getCanonicalPath()) : (t.cacheDir = e.getFilesDir().getCanonicalPath(), t.codeCacheDir = e.getCacheDir().getCanonicalPath()) } function Ri(t, e) { let n = t.use("java.io.File"); t.loader = e.getClassLoader(); let r = n.$new(e.getDataDir()).getCanonicalPath(); t.cacheDir = r, t.codeCacheDir = r + "/cache" } var rp, ji, Fr, Dr, op, Fi = te(() => { U(); gr(); gt(); Mi(); br(); lt(); Tr(); kt(); We(); rp = 4, ji = Process.pointerSize, Fr = class { ACC_PUBLIC = 1; ACC_PRIVATE = 2; ACC_PROTECTED = 4; ACC_STATIC = 8; ACC_FINAL = 16; ACC_SYNCHRONIZED = 32; ACC_BRIDGE = 64; ACC_VARARGS = 128; ACC_NATIVE = 256; ACC_ABSTRACT = 1024; ACC_STRICT = 2048; ACC_SYNTHETIC = 4096; constructor() { this.classFactory = null, this.ClassFactory = Pe, this.vm = null, this.api = null, this._initialized = !1, this._apiError = null, this._wakeupHandler = null, this._pollListener = null, this._pendingMainOps = [], this._pendingVmOps = [], this._cachedIsAppProcess = null; try { this._tryInitialize() } catch { } } _tryInitialize() { if (this._initialized) return !0; if (this._apiError !== null) throw this._apiError; let e; try { e = yt(), this.api = e } catch (r) { throw this._apiError = r, r } if (e === null) return !1; let n = new Ae(e); return this.vm = n, fi(n), Pe._initialize(n, e), this.classFactory = new Pe, this._initialized = !0, !0 } _dispose() { if (this.api === null) return; let { vm: e } = this; e.perform(n => { Pe._disposeAll(n), y.dispose(n) }), Script.nextTick(() => { Ae.dispose(e) }) } get available() { return this._tryInitialize() } get androidVersion() { return mt() } synchronized(e, n) { let { $h: r = e } = e; if (!(r instanceof NativePointer)) throw new Error("Java.synchronized: the first argument `obj` must be either a pointer or a Java instance"); let o = this.vm.getEnv(); fe("VM::MonitorEnter", o.monitorEnter(r)); try { n() } finally { o.monitorExit(r) } } enumerateLoadedClasses(e) { this._checkAvailable(); let { flavor: n } = this.api; n === "jvm" ? this._enumerateLoadedClassesJvm(e) : n === "art" ? this._enumerateLoadedClassesArt(e) : this._enumerateLoadedClassesDalvik(e) } enumerateLoadedClassesSync() { let e = []; return this.enumerateLoadedClasses({ onMatch(n) { e.push(n) }, onComplete() { } }), e } enumerateClassLoaders(e) { this._checkAvailable(); let { flavor: n } = this.api; if (n === "jvm") this._enumerateClassLoadersJvm(e); else if (n === "art") this._enumerateClassLoadersArt(e); else throw new Error("Enumerating class loaders is not supported on Dalvik") } enumerateClassLoadersSync() { let e = []; return this.enumerateClassLoaders({ onMatch(n) { e.push(n) }, onComplete() { } }), e } _enumerateLoadedClassesJvm(e) { let { api: n, vm: r } = this, { jvmti: o } = n, i = r.getEnv(), s = Memory.alloc(rp), l = Memory.alloc(ji); o.getLoadedClasses(s, l); let a = s.readS32(), c = l.readPointer(), d = []; for (let p = 0; p !== a; p++)d.push(c.add(p * ji).readPointer()); o.deallocate(c); try { for (let p of d) { let f = i.getClassName(p); e.onMatch(f, p) } e.onComplete() } finally { d.forEach(p => { i.deleteLocalRef(p) }) } } _enumerateClassLoadersJvm(e) { this.choose("java.lang.ClassLoader", e) } _enumerateLoadedClassesArt(e) { let { vm: n, api: r } = this, o = n.getEnv(), i = r["art::JavaVMExt::AddGlobalRef"], { vm: s } = r; Se(n, o, l => { let a = rr(c => { let d = i(s, l, c); try { let p = o.getClassName(d); e.onMatch(p, d) } finally { o.deleteGlobalRef(d) } return !0 }); r["art::ClassLinker::VisitClasses"](r.artClassLinker.address, a) }), e.onComplete() } _enumerateClassLoadersArt(e) { let { classFactory: n, vm: r, api: o } = this, i = r.getEnv(), s = o["art::ClassLinker::VisitClassLoaders"]; if (s === void 0) throw new Error("This API is only available on Android >= 7.0"); let l = n.use("java.lang.ClassLoader"), a = [], c = o["art::JavaVMExt::AddGlobalRef"], { vm: d } = o; Se(r, i, p => { let f = or(u => (a.push(c(d, p, u)), !0)); nr(() => { s(o.artClassLinker.address, f) }) }); try { a.forEach(p => { let f = n.cast(p, l); e.onMatch(f) }) } finally { a.forEach(p => { i.deleteGlobalRef(p) }) } e.onComplete() } _enumerateLoadedClassesDalvik(e) { let { api: n } = this, r = ptr("0xcbcacccd"), o = 172, i = 8, l = n.gDvm.add(o).readPointer(), a = l.readS32(), d = l.add(12).readPointer(), p = a * i; for (let f = 0; f < p; f += i) { let _ = d.add(f).add(4).readPointer(); if (_.isNull() || _.equals(r)) continue; let g = _.add(24).readPointer().readUtf8String(); if (g.startsWith("L")) { let b = g.substring(1, g.length - 1).replace(/\//g, "."); e.onMatch(b) } } e.onComplete() } enumerateMethods(e) { let { classFactory: n } = this, r = this.vm.getEnv(), o = n.use("java.lang.ClassLoader"); return Je.enumerateMethods(e, this.api, r).map(i => { let s = i.loader; return i.loader = s !== null ? n.wrap(s, o, r) : null, i }) } scheduleOnMainThread(e) { this.performNow(() => { this._pendingMainOps.push(e); let { _wakeupHandler: n } = this; if (n === null) { let { classFactory: r } = this, o = r.use("android.os.Handler"), i = r.use("android.os.Looper"); n = o.$new(i.getMainLooper()), this._wakeupHandler = n } this._pollListener === null && (this._pollListener = Interceptor.attach(Process.getModuleByName("libc.so").getExportByName("epoll_wait"), this._makePollHook()), Interceptor.flush()), n.sendEmptyMessage(1) }) } _makePollHook() { let e = Process.id, { _pendingMainOps: n } = this; return function () { if (this.threadId !== e) return; let r; for (; (r = n.shift()) !== void 0;)try { r() } catch (o) { Script.nextTick(() => { throw o }) } } } perform(e) { if (this._checkAvailable(), !this._isAppProcess() || this.classFactory.loader !== null) try { this.vm.perform(e) } catch (n) { Script.nextTick(() => { throw n }) } else this._pendingVmOps.push(e), this._pendingVmOps.length === 1 && this._performPendingVmOpsWhenReady() } performNow(e) { return this._checkAvailable(), this.vm.perform(() => { let { classFactory: n } = this; if (this._isAppProcess() && n.loader === null) { let o = n.use("android.app.ActivityThread").currentApplication(); o !== null && Oi(n, o) } return e() }) } _performPendingVmOpsWhenReady() { this.vm.perform(() => { let { classFactory: e } = this, n = e.use("android.app.ActivityThread"), r = n.currentApplication(); if (r !== null) { Oi(e, r), this._performPendingVmOps(); return } let o = this, i = !1, s = "early", l = n.handleBindApplication; l.implementation = function (d) { if (d.instrumentationName.value !== null) { s = "late"; let f = e.use("android.app.LoadedApk").makeApplication; f.implementation = function (u, _) { return i || (i = !0, Ri(e, this), o._performPendingVmOps()), f.apply(this, arguments) } } l.apply(this, arguments) }; let c = n.getPackageInfo.overloads.map(d => [d.argumentTypes.length, d]).sort(([d], [p]) => p - d).map(([d, p]) => p)[0]; c.implementation = function (...d) { let p = c.call(this, ...d); return !i && s === "early" && (i = !0, Ri(e, p), o._performPendingVmOps()), p } }) } _performPendingVmOps() { let { vm: e, _pendingVmOps: n } = this, r; for (; (r = n.shift()) !== void 0;)try { e.perform(r) } catch (o) { Script.nextTick(() => { throw o }) } } use(e, n) { return this.classFactory.use(e, n) } openClassFile(e) { return this.classFactory.openClassFile(e) } choose(e, n) { this.classFactory.choose(e, n) } retain(e) { return this.classFactory.retain(e) } cast(e, n) { return this.classFactory.cast(e, n) } array(e, n) { return this.classFactory.array(e, n) } backtrace(e) { return ir(this.vm, e) } isMainThread() { let e = this.classFactory.use("android.os.Looper"), n = e.getMainLooper(), r = e.myLooper(); return r === null ? !1 : n.$isSameObject(r) } registerClass(e) { return this.classFactory.registerClass(e) } deoptimizeEverything() { let { vm: e } = this; return cr(e, e.getEnv()) } deoptimizeBootImage() { let { vm: e } = this; return dr(e, e.getEnv()) } deoptimizeMethod(e) { let { vm: n } = this; return lr(n, n.getEnv(), e) } _checkAvailable() { if (!this.available) throw new Error("Java API not available") } _isAppProcess() { let e = this._cachedIsAppProcess; if (e === null) { if (this.api.flavor === "jvm") return e = !1, this._cachedIsAppProcess = e, e; let n = new NativeFunction(Module.getGlobalExportByName("readlink"), "pointer", ["pointer", "pointer", "pointer"], { exceptions: "propagate" }), r = Memory.allocUtf8String("/proc/self/exe"), o = 1024, i = Memory.alloc(o), s = n(r, i, ptr(o)).toInt32(); if (s !== -1) { let l = i.readUtf8String(s); e = /^\/system\/bin\/app_process/.test(l) } else e = !0; this._cachedIsAppProcess = e } return e } }; Dr = new Fr; Script.bindWeak(Dr, () => { Dr._dispose() }); op = Dr }); var ip = Gi(() => { U(); var Fe = (Fi(), Hi(Pi)); function pe(t) { var e = new Date().toISOString(), n = `[${e}] ${t}`; send({ type: "log", data: n }) } function Di(t) { Fe.available ? Fe.perform(t) : (pe("Waiting for Java VM to initialize..."), setTimeout(function () { Di(t) }, 100)) } Di(function () { pe("Frida hooks injected successfully."); try { var t = Fe.use("javax.crypto.Cipher"); t.init.overload("int", "java.security.Key").implementation = function (s, l) { var a = s === 1 ? "ENCRYPT" : s === 2 ? "DECRYPT" : s; pe(`Crypto API: Cipher.init() called for ${a} mode with key algorithm: ${l.getAlgorithm()}`), this.init(s, l) }, t.doFinal.overload("[B").implementation = function (s) { return pe(`Crypto API: Cipher.doFinal() called with payload length: ${s.length} bytes`), this.doFinal(s) } } catch (s) { pe(`Failed to hook Cipher: ${s}`) } try { var e = Fe.use("java.lang.Runtime"); e.exec.overload("java.lang.String").implementation = function (s) { return pe(`Command Execution: Runtime.exec("${s}")`), this.exec(s) }, e.exec.overload("[Ljava.lang.String;").implementation = function (s) { return pe(`Command Execution: Runtime.exec([${s.join(", ")}])`), this.exec(s) } } catch (s) { pe(`Failed to hook Runtime: ${s}`) } try { var n = Fe.use("android.telephony.SmsManager"); n.sendTextMessage.overload("java.lang.String", "java.lang.String", "java.lang.String", "android.app.PendingIntent", "android.app.PendingIntent").implementation = function (s, l, a, c, d) { pe(`SMS Manager: Sending SMS to ${s} with text: "${a}"`), this.sendTextMessage(s, l, a, c, d) } } catch (s) { pe(`Failed to hook SmsManager: ${s}`) } try { var r = Fe.use("java.net.URL"); r.$init.overload("java.lang.String").implementation = function (s) { pe(`Network Connection: Opening URL -> ${s}`), this.$init(s) } } catch (s) { pe(`Failed to hook URL: ${s}`) } try { var o = Fe.use("android.util.Base64"); o.decode.overload("java.lang.String", "int").implementation = function (s, l) { return pe(`Obfuscation/Data: Base64 decode string: "${s.substring(0, 50)}${s.length > 50 ? "..." : ""}"`), this.decode(s, l) } } catch (s) { pe(`Failed to hook Base64: ${s}`) } try { var i = Fe.use("java.io.File"); i.$init.overload("java.lang.String").implementation = function (s) { !s.startsWith("/system/") && !s.startsWith("/data/app/") && pe(`File Access: new File("${s}")`), this.$init(s) } } catch (s) { pe(`Failed to hook File: ${s}`) } }) }); export default ip();
