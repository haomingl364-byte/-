import { Solar, Lunar, EightChar, LunarUtil, SolarUtil, DaYun as LunarDaYun } from 'lunar-javascript';
import { BaZiChart, Pillar, Gender, ElementType, DaYun, HiddenStem, LiuNian, CalendarType, UserInput } from '../types';
import { STEM_ELEMENTS, BRANCH_ELEMENTS, ELEMENT_CN, PROVINCES_DATA, GAN, ZHI } from '../constants';

const getElement = (char: string): ElementType => {
  const type = STEM_ELEMENTS[char] || BRANCH_ELEMENTS[char] || 'earth';
  return type as ElementType;
};

// --- Local Helpers for robustness ---
const CHANG_SHENG = '长生,沐浴,冠带,临官,帝旺,衰,病,死,墓,绝,胎,养'.split(',');

const getLifeStage = (gan: string, zhi: string): string => {
  const ganIndex = GAN.indexOf(gan);
  const zhiIndex = ZHI.indexOf(zhi);
  if (ganIndex === -1 || zhiIndex === -1) return '';

  let startZhiIndex = 0;
  let forward = true;

  switch (gan) {
    case '甲': startZhiIndex = 11; break; // Hai
    case '乙': startZhiIndex = 6; forward = false; break; // Wu
    case '丙': startZhiIndex = 2; break; // Yin
    case '丁': startZhiIndex = 9; forward = false; break; // You
    case '戊': startZhiIndex = 2; break; // Yin
    case '己': startZhiIndex = 9; forward = false; break; // You
    case '庚': startZhiIndex = 5; break; // Si
    case '辛': startZhiIndex = 0; forward = false; break; // Zi
    case '壬': startZhiIndex = 8; break; // Shen
    case '癸': startZhiIndex = 3; forward = false; break; // Mao
  }

  let offset = 0;
  if (forward) {
    offset = zhiIndex - startZhiIndex;
  } else {
    offset = startZhiIndex - zhiIndex;
  }

  if (offset < 0) offset += 12;
  
  return CHANG_SHENG[offset % 12];
};

const SHI_SHEN_MAP: {[key: string]: string} = {
  '甲甲': '比肩', '甲乙': '劫财', '甲丙': '食神', '甲丁': '伤官', '甲戊': '偏财', '甲己': '正财', '甲庚': '七杀', '甲辛': '正官', '甲壬': '偏印', '甲癸': '正印',
  '乙甲': '劫财', '乙乙': '比肩', '乙丙': '伤官', '乙丁': '食神', '乙戊': '正财', '乙己': '偏财', '乙庚': '正官', '乙辛': '七杀', '乙壬': '正印', '乙癸': '偏印',
  '丙甲': '偏印', '丙乙': '正印', '丙丙': '比肩', '丙丁': '劫财', '丙戊': '食神', '丙己': '伤官', '丙庚': '偏财', '丙辛': '正财', '丙壬': '七杀', '丙癸': '正官',
  '丁甲': '正印', '丁乙': '偏印', '丁丙': '劫财', '丁丁': '比肩', '丁戊': '伤官', '丁己': '食神', '丁庚': '正财', '丁辛': '偏财', '丁壬': '正官', '丁癸': '七杀',
  '戊甲': '七杀', '戊乙': '正官', '戊丙': '偏印', '戊丁': '正印', '戊戊': '比肩', '戊己': '劫财', '戊庚': '食神', '戊辛': '伤官', '戊壬': '偏财', '戊癸': '正财',
  '己甲': '正官', '己乙': '七杀', '己丙': '正印', '己丁': '偏印', '己戊': '劫财', '己己': '比肩', '己庚': '伤官', '己辛': '食神', '己壬': '正财', '己癸': '偏财',
  '庚甲': '偏财', '庚乙': '正财', '庚丙': '七杀', '庚丁': '正官', '庚戊': '偏印', '庚己': '正印', '庚庚': '比肩', '庚辛': '劫财', '庚壬': '食神', '庚癸': '伤官',
  '辛甲': '正财', '辛乙': '偏财', '辛丙': '正官', '辛丁': '七杀', '辛戊': '正印', '辛己': '偏印', '辛庚': '劫财', '辛辛': '比肩', '辛壬': '伤官', '辛癸': '食神',
  '壬甲': '食神', '壬乙': '伤官', '壬丙': '偏财', '壬丁': '正财', '壬戊': '七杀', '壬己': '正官', '壬庚': '偏印', '壬辛': '正印', '壬壬': '比肩', '壬癸': '劫财',
  '癸甲': '伤官', '癸乙': '食神', '癸丙': '正财', '癸丁': '偏财', '癸戊': '正官', '癸己': '七杀', '癸庚': '正印', '癸辛': '偏印', '癸壬': '劫财', '癸癸': '比肩'
};

const getShiShen = (dayMaster: string, targetStem: string): string => {
    return SHI_SHEN_MAP[dayMaster + targetStem] || '';
};

const getShenSha = (pillarBranch: string, yearBranch: string, dayBranch: string, dayStem: string): string[] => {
  const list: string[] = [];
  const zhi = pillarBranch;

  const isYiMa = (base: string) => {
    if (['申', '子', '辰'].includes(base) && zhi === '寅') return true;
    if (['寅', '午', '戌'].includes(base) && zhi === '申') return true;
    if (['亥', '卯', '未'].includes(base) && zhi === '巳') return true;
    if (['巳', '酉', '丑'].includes(base) && zhi === '亥') return true;
    return false;
  };
  if (isYiMa(yearBranch) || isYiMa(dayBranch)) list.push('驿马');

  const isTaoHua = (base: string) => {
    if (['申', '子', '辰'].includes(base) && zhi === '酉') return true;
    if (['寅', '午', '戌'].includes(base) && zhi === '卯') return true;
    if (['亥', '卯', '未'].includes(base) && zhi === '子') return true;
    if (['巳', '酉', '丑'].includes(base) && zhi === '午') return true;
    return false;
  };
  if (isTaoHua(yearBranch) || isTaoHua(dayBranch)) list.push('咸池');

  const isTianYi = (stem: string) => {
     if (['甲', '戊', '庚'].includes(stem) && ['丑', '未'].includes(zhi)) return true;
     if (['乙', '己'].includes(stem) && ['子', '申'].includes(zhi)) return true;
     if (['丙', '丁'].includes(stem) && ['亥', '酉'].includes(zhi)) return true;
     if (['壬', '癸'].includes(stem) && ['巳', '卯'].includes(zhi)) return true;
     if (['辛'].includes(stem) && ['午', '寅'].includes(zhi)) return true;
     return false;
  };
  if (isTianYi(dayStem)) list.push('天乙');

  const wenChangMap: {[key:string]: string} = {'甲':'巳', '乙':'午', '丙':'申', '戊':'申', '丁':'酉', '己':'酉', '庚':'亥', '辛':'子', '壬':'寅', '癸':'卯'};
  if (wenChangMap[dayStem] === zhi) list.push('文昌');

  const luMap: {[key:string]: string} = {'甲':'寅', '乙':'卯', '丙':'巳', '戊':'巳', '丁':'午', '己':'午', '庚':'申', '辛':'酉', '壬':'亥', '癸':'子'};
  if (luMap[dayStem] === zhi) list.push('禄神');

  const renMap: {[key:string]: string} = {'甲':'卯', '乙':'辰', '丙':'午', '戊':'午', '丁':'未', '己':'未', '庚':'酉', '辛':'戌', '壬':'子', '癸':'丑'};
  if (renMap[dayStem] === zhi) list.push('羊刃');

  return list;
};

const createPillar = (
  stem: string, 
  branch: string, 
  eightChar: any, 
  pillarType: 'year' | 'month' | 'day' | 'time',
  dayMaster: string,
  yearBranch: string,
  dayBranch: string
): Pillar => {
  
  let tenGod = '';
  let naYin = '';
  let lifeStage = '';
  let hiddenStems: HiddenStem[] = [];
  let isKongWang = false;
  let shenSha: string[] = [];

  if (eightChar) {
    switch(pillarType) {
      case 'year':
        tenGod = eightChar.getYearShiShenGan();
        naYin = eightChar.getYearNaYin();
        lifeStage = eightChar.getYearDiShi(); 
        break;
      case 'month':
        tenGod = eightChar.getMonthShiShenGan();
        naYin = eightChar.getMonthNaYin();
        lifeStage = eightChar.getMonthDiShi();
        break;
      case 'day':
        tenGod = '日主';
        naYin = eightChar.getDayNaYin();
        lifeStage = eightChar.getDayDiShi();
        break;
      case 'time':
        tenGod = eightChar.getTimeShiShenGan();
        naYin = eightChar.getTimeNaYin();
        lifeStage = eightChar.getTimeDiShi();
        break;
    }

    let hiddenGans: string[] = [];
    let hiddenShiShens: string[] = [];
    
    if (pillarType === 'year') {
      hiddenGans = eightChar.getYearHideGan();
      hiddenShiShens = eightChar.getYearShiShenZhi();
    } else if (pillarType === 'month') {
      hiddenGans = eightChar.getMonthHideGan();
      hiddenShiShens = eightChar.getMonthShiShenZhi();
    } else if (pillarType === 'day') {
      hiddenGans = eightChar.getDayHideGan();
      hiddenShiShens = eightChar.getDayShiShenZhi();
    } else {
      hiddenGans = eightChar.getTimeHideGan();
      hiddenShiShens = eightChar.getTimeShiShenZhi();
    }

    hiddenStems = hiddenGans.map((gan, idx) => ({
      stem: gan,
      tenGod: hiddenShiShens[idx] || '',
      element: getElement(gan)
    }));

    shenSha = getShenSha(branch, yearBranch, dayBranch, dayMaster);
    const kongWangList = eightChar.getDayXunKong();
    isKongWang = kongWangList.includes(branch);
  }

  return {
    stem,
    stemTenGod: tenGod,
    stemElement: getElement(stem),
    branch,
    branchElement: getElement(branch),
    hiddenStems,
    naYin,
    lifeStage,
    shenSha,
    kongWang: isKongWang
  };
};

// --- Ren Yuan Si Ling Logic ---

interface CommanderRule {
  gan: string;
  days: number;
}

const COMMANDER_TABLE: {[key: string]: CommanderRule[]} = {
  '寅': [{gan: '己', days: 7}, {gan: '丙', days: 5}, {gan: '甲', days: 18}],
  '卯': [{gan: '甲', days: 9}, {gan: '癸', days: 3}, {gan: '乙', days: 18}],
  '辰': [{gan: '乙', days: 7}, {gan: '癸', days: 5}, {gan: '戊', days: 18}],
  '巳': [{gan: '戊', days: 7}, {gan: '庚', days: 5}, {gan: '丙', days: 18}],
  '午': [{gan: '丙', days: 9}, {gan: '己', days: 3}, {gan: '丁', days: 18}],
  '未': [{gan: '丁', days: 7}, {gan: '乙', days: 5}, {gan: '己', days: 18}],
  '申': [{gan: '己', days: 7}, {gan: '壬', days: 5}, {gan: '庚', days: 18}], 
  '酉': [{gan: '庚', days: 2}, {gan: '己', days: 1}, {gan: '辛', days: 27}],
  '戌': [{gan: '辛', days: 7}, {gan: '丁', days: 5}, {gan: '戊', days: 18}],
  '亥': [{gan: '戊', days: 7}, {gan: '甲', days: 5}, {gan: '壬', days: 18}],
  '子': [{gan: '壬', days: 9}, {gan: '辛', days: 3}, {gan: '癸', days: 18}],
  '丑': [{gan: '癸', days: 7}, {gan: '辛', days: 5}, {gan: '己', days: 18}],
};

const getRenYuanCommander = (monthBranch: string, daysSinceJie: number): string => {
  const rules = COMMANDER_TABLE[monthBranch];
  if (!rules) return '未知';

  const currentDay = daysSinceJie + 1;
  
  let accumulatedDays = 0;
  let matchedGan = '';
  
  for (const rule of rules) {
    accumulatedDays += rule.days;
    if (currentDay <= accumulatedDays) {
      matchedGan = rule.gan;
      break;
    }
  }
  if (!matchedGan) matchedGan = rules[rules.length - 1].gan;

  const elementKey = STEM_ELEMENTS[matchedGan];
  const elementCn = ELEMENT_CN[elementKey] || '';

  return `${matchedGan}${elementCn}司令`;
};


// --- Reverse Search Function ---

export interface MatchingDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  ganZhi: string; 
}

/**
 * 修复版八字反推搜索算法
 * 采用基于“节气区间”的遍历，确保不会遗漏任何年月柱组合。
 */
export const findDatesFromPillars = (
  yGan: string, yZhi: string,
  mGan: string, mZhi: string,
  dGan: string, dZhi: string,
  hGan: string, hZhi: string
): MatchingDate[] => {
  const matches: MatchingDate[] = [];
  const startYear = 1900;
  const endYear = 2100;
  
  // 初始日期设为公历 1900年1月1日
  let currentSolar = Solar.fromYmd(startYear, 1, 1);
  const endSolar = Solar.fromYmd(endYear, 12, 31);
  
  // 搜索循环：逐个节气区间移动
  while (currentSolar.isBefore(endSolar)) {
    const lunar = currentSolar.getLunar();
    const nextJie = lunar.getNextJie();
    const nextJieSolar = nextJie.getSolar();
    
    // 检查当前区间的年月柱
    // 取该区间中点附近的一个时间点进行核对
    const checkPoint = currentSolar.next(2); 
    const ec = checkPoint.getLunar().getEightChar();
    ec.setSect(2); // 默认使用晚子时逻辑进行大范围搜索

    if (ec.getYearGan() === yGan && ec.getYearZhi() === yZhi &&
        ec.getMonthGan() === mGan && ec.getMonthZhi() === mZhi) {
        
        // 年柱和月柱匹配成功！进入该区间进行逐日扫描
        let dayRunner = currentSolar;
        // 扫描从当前起点到下一个节气结束前的所有日期
        while (dayRunner.isBefore(nextJieSolar) || dayRunner.toYmd() === nextJieSolar.toYmd()) {
            
            // 扫描每一个双小时（涵盖所有 12 个时辰）
            // 晚子时 23:00 和 早子时 00:00 都会被扫描
            const testHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 23];
            
            for (const h of testHours) {
                const hSolar = Solar.fromYmdHms(dayRunner.getYear(), dayRunner.getMonth(), dayRunner.getDay(), h, 0, 0);
                const hec = hSolar.getLunar().getEightChar();
                hec.setSect(2);
                
                // 全柱匹配检查
                if (hec.getYearGan() === yGan && hec.getYearZhi() === yZhi &&
                    hec.getMonthGan() === mGan && hec.getMonthZhi() === mZhi &&
                    hec.getDayGan() === dGan && hec.getDayZhi() === dZhi &&
                    hec.getTimeGan() === hGan && hec.getTimeZhi() === hZhi) {
                    
                    matches.push({
                        year: dayRunner.getYear(),
                        month: dayRunner.getMonth(),
                        day: dayRunner.getDay(),
                        hour: h,
                        ganZhi: `${yGan}${yZhi} ${mGan}${mZhi} ${dGan}${dZhi} ${hGan}${hZhi}`
                    });
                    // 每个日期每个时柱只有一个，找到即跳出小时循环
                    break; 
                }
            }
            dayRunner = dayRunner.next(1);
        }
        // 完成该年月区间的搜索，跳转到下一个节气起点
        currentSolar = nextJieSolar;
    } else {
        // 年月柱不匹配，直接跳转到下一个节气起点
        currentSolar = nextJieSolar;
    }
    
    // 安全熔断，防止极端情况
    if (matches.length > 200) break; 
  }
  
  return matches;
};

// --- Main Calculator ---

export const calculateBaZi = (input: UserInput): BaZiChart => {
  
  let solar: Solar;

  if (input.calendarType === CalendarType.LUNAR) {
    const lunarMonth = input.isLeapMonth ? -input.month : input.month; // Handle leap month
    solar = Lunar.fromYmdHms(input.year, lunarMonth, input.day, input.hour, input.minute, 0).getSolar();
  } else {
    solar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0);
  }

  // 从省份数据中获取经度
  const provinceData = PROVINCES_DATA[input.selectedProvince] || PROVINCES_DATA['全国'];
  const longitude = provinceData[input.selectedCityKey] || 120.0;
  
  if (longitude !== 120.0) {
      const offsetMinutes = (longitude - 120.0) * 4;
      const date = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour(), solar.getMinute());
      date.setMinutes(date.getMinutes() + offsetMinutes);
      solar = Solar.fromDate(date);
  }

  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  
  // Set Sect based on Early/Late Rat preference
  eightChar.setSect(input.processEarlyLateRat ? 2 : 1); 

  const dayMaster = eightChar.getDayGan();
  const dayBranch = eightChar.getDayZhi();
  const yearBranch = eightChar.getYearZhi();

  const yearPillar = createPillar(eightChar.getYearGan(), eightChar.getYearZhi(), eightChar, 'year', dayMaster, yearBranch, dayBranch);
  const monthPillar = createPillar(eightChar.getMonthGan(), eightChar.getMonthZhi(), eightChar, 'month', dayMaster, yearBranch, dayBranch);
  const dayPillar = createPillar(eightChar.getDayGan(), eightChar.getDayZhi(), eightChar, 'day', dayMaster, yearBranch, dayBranch);
  const hourPillar = createPillar(eightChar.getTimeGan(), eightChar.getTimeZhi(), eightChar, 'time', dayMaster, yearBranch, dayBranch);
  
  const dayKongWang = eightChar.getDayXunKong(); // returns string e.g. "戌亥"

  const prevJie = lunar.getPrevJie();
  const daysAfterJie = Math.floor(Math.abs(solar.subtract(prevJie.getSolar())));
  const solarTermStr = `出生于${prevJie.getName()}后第${daysAfterJie}日`;
  
  const renYuanSiLing = getRenYuanCommander(eightChar.getMonthZhi(), daysAfterJie);

  const genderNum = input.gender === Gender.MALE ? 1 : 0;
  const yun = eightChar.getYun(genderNum);
  
  const daYunList: DaYun[] = [];
  const daYunArr = yun.getDaYun();
  
  const startLuckText = `约${yun.getStartYear()}年${yun.getStartMonth()}个月${yun.getStartDay()}日后上运`;

  const yunQian: LiuNian[] = [];
  const birthYear = solar.getYear();
  
  for (let i = 1; i <= 8; i++) {
    const dy: LunarDaYun = daYunArr[i];
    if (!dy) break;
    
    const ganZhi = dy.getGanZhi();
    const stem = ganZhi.substring(0, 1);
    const branch = ganZhi.substring(1, 2);
    
    let stemTenGod = getShiShen(dayMaster, stem);

    const liuNianList: LiuNian[] = [];
    const liuNianArr = dy.getLiuNian(); 
    
    for (let k=0; k<liuNianArr.length; k++) {
        const ln = liuNianArr[k];
        liuNianList.push({
            year: ln.getYear(),
            ganZhi: ln.getGanZhi()
        });
    }

    const yunLifeStage = getLifeStage(dayMaster, branch);
    
    let yunNaYin = '';
    try { yunNaYin = LunarUtil.getNaYin(ganZhi); } catch(e) { yunNaYin = ''; }

    daYunList.push({
      index: i,
      startAge: dy.getStartAge(),
      startYear: dy.getStartYear(),
      stem,
      stemTenGod,
      stemElement: getElement(stem),
      branch,
      branchElement: getElement(branch),
      ganZhi,
      lifeStage: yunLifeStage,
      naYin: yunNaYin,
      liuNian: liuNianList
    });
  }

  const firstLuckYear = daYunList[0]?.startYear || (birthYear + 10);
  for (let y = birthYear; y < firstLuckYear; y++) {
      const l = Solar.fromYmdHms(y, 6, 1, 0,0,0).getLunar();
      yunQian.push({
          year: y,
          ganZhi: l.getYearInGanZhi()
      });
  }

  return {
    type: 'calculated',
    solarDateStr: `阳历${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日 ${solar.getHour()}时${solar.getMinute()}分`,
    lunarDateStr: `农历${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}, ${lunar.getTimeZhi()}时`,
    solarTermStr,
    startLuckText,
    
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    
    dayKongWang, // Pass to chart
    renYuanSiLing, 
    
    daYun: daYunList,
    yunQian: yunQian
  };
};
