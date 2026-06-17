/**
 * 文本解码工具模块
 * 负责将二进制数据转换为指定编码（如 GBK）的文本
 */

import iconv from 'iconv-lite';
import { Buffer } from 'buffer';

/**
 * 将 Buffer 或 ArrayBuffer 解码为指定编码的字符串
 * 
 * @param data 需要解码的二进制数据
 * @param encoding 目标编码格式，默认为 'gbk'
 * @returns 解码后的字符串
 * 
 * @example
 * const text = decodeToText(arrayBuffer, 'gbk');
 */
export function decodeToText(data: Buffer | ArrayBuffer | Uint8Array, encoding: string = 'gbk'): string {
  if (!data) return '';
  // 确保转换为 Buffer 类型以便 iconv-lite 处理
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
  return iconv.decode(buf, encoding);
}

/**
 * 专门用于解码 GBK 编码数据的快捷函数
 * 教务系统大多使用 GBK 编码
 * 
 * @param data 需要解码的二进制数据
 * @returns 解码后的文本
 */
export function decodeGbk(data: Buffer | ArrayBuffer | Uint8Array): string {
  return decodeToText(data, 'gbk');
}

/**
 * 将字符串编码为 GBK 格式的 URL 编码（%XX 形式）
 * 教务系统搜索参数（如教师名字）需用此格式传递
 *
 * @param str 待编码的字符串
 * @returns GBK URL 编码结果
 *
 * @example
 * encodeGbkUrl('蒲海波') // '%C6%D1%BA%A3%B2%A8'
 */
export function encodeGbkUrl(str: string): string {
  const buf = iconv.encode(str, 'gbk');
  return [...new Uint8Array(buf)]
    .map((b) => '%' + b.toString(16).toUpperCase().padStart(2, '0'))
    .join('');
}
