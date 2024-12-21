// 时间字符串转换为小数小时
export function timeToDecimal(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return Math.max(0, Math.min(24, hours + (minutes || 0) / 60));
}

// 小数小时转换为百分比位置
export function hourToPosition(hour) {
    return (hour / 24) * 100;
}
