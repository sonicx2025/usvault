/* 超声常用器官 WHO 病理分类词库与输入联想引擎
 * 词条格式：[中文名称, 拼音首字母, 全拼/英文缩写/别名, 分类(良性|恶性|交界|炎性|穿刺)]
 */
'use strict';

window.USV_PATHOLOGY = (() => {
  const ORGAN_RULES = [
    ['甲状腺', /甲状|甲旁/],
    ['乳腺', /乳/],
    ['肝脏', /肝/],
    ['胆囊', /胆/],
    ['胰腺', /胰/],
    ['脾脏', /脾/],
    ['肾脏', /肾/],
    ['膀胱', /膀胱|尿路|输尿管/],
    ['前列腺', /前列腺/],
    ['子宫附件', /子宫|卵巢|附件|宫颈|盆腔|输卵管|内膜/],
    ['浅表淋巴结', /淋巴/],
    ['肌骨', /肌骨|软组织|皮下|关节|肌腱|体表|四肢|肌肉|神经|浅表肿物/],
    ['阴囊', /阴囊|睾丸|附睾|精索/],
    ['涎腺', /腮腺|颌下腺|舌下腺|涎腺|唾液腺/],
  ];

  const DICT = {
    '甲状腺': [
      // 穿刺细胞学 (Bethesda)
      ['Bethesda I类：标本不满意/无法诊断', 'b1lbbbmy', 'bethesda 1 i nondiagnostic', '穿刺'],
      ['Bethesda II类：良性病变', 'b2llxbb', 'bethesda 2 ii benign', '穿刺'],
      ['Bethesda III类：意义不明确的非典型病变 (AUS)', 'b3lyybmq', 'bethesda 3 iii aus flus', '穿刺'],
      ['Bethesda IV类：滤泡性肿瘤 (FN)', 'b4llpxzl', 'bethesda 4 iv fn sf', '穿刺'],
      ['Bethesda V类：可疑恶性 (SM)', 'b5lkyex', 'bethesda 5 v sm suspicious', '穿刺'],
      ['Bethesda VI类：恶性', 'b6lex', 'bethesda 6 vi malignant', '穿刺'],
      // 良性 / 非肿瘤 (WHO 5th)
      ['甲状腺滤泡结节性疾病（结节性甲状腺肿）', 'jzxlpjjsjbjjxjzx', 'jiazhuangxianlvpaojiejie jjx jjxjzx jiejia fnd goiter', '良性'],
      ['甲状腺滤泡性腺瘤', 'jzxlpxxl', 'lvpaoxingxianliu lpxxl lpxl fa adenoma', '良性'],
      ['嗜酸细胞腺瘤', 'ssxbxl', 'shisuanxibaoxianliu hurthle oncocytic', '良性'],
      ['桥本甲状腺炎（慢性淋巴细胞性甲状腺炎）', 'qbjzxy', 'qiaobenjiazhuangxianyan qb hashimoto ht', '炎性'],
      ['亚急性甲状腺炎（肉芽肿性甲状腺炎）', 'yjxjzxy', 'yajixingjiazhuangxianyan yjy dequervain', '炎性'],
      ['无痛性甲状腺炎', 'wtxjzxy', 'wutongxingjiazhuangxianyan', '炎性'],
      ['甲状舌管囊肿', 'jzsgns', 'jiazhuangsheguannangzhong jzsgnz tdc', '良性'],
      ['甲状旁腺腺瘤', 'jzpxxl', 'jiazhuangpangxianxianliu pxxl parathyroid adenoma', '良性'],
      ['甲状旁腺增生', 'jzpxzs', 'jiazhuangpangxianzengsheng pxzs', '良性'],
      // 低危肿瘤
      ['具有乳头状核特征的非浸润性滤泡性甲状腺肿瘤 (NIFTP)', 'niftp', 'niftp feijinrunxinglvpao', '交界'],
      ['恶性潜能未定的甲状腺肿瘤 (UMP)', 'exqnwd', 'ump ftump wdtump', '交界'],
      ['透明变梁状肿瘤', 'tmblzzl', 'toumingbianliangzhuangzhongliu htt', '交界'],
      // 恶性肿瘤
      ['甲状腺乳头状癌 (PTC)', 'jzxrtza rtza', 'jiazhuangxianrutouzhuangai rutouzhuangai ptc', '恶性'],
      ['甲状腺乳头状微小癌 (PTMC)', 'jzxrtzwxa rtzwxa wxa', 'rutouzhuangweixiaoai ptmc', '恶性'],
      ['乳头状癌（滤泡亚型）', 'rtzalpyx', 'rutouzhuangai lvpaoyaxing fvptc', '恶性'],
      ['乳头状癌（高细胞亚型）', 'rtzagxbyx', 'rutouzhuangai gaoxibao tallcell', '恶性'],
      ['甲状腺滤泡癌 (FTC)', 'jzxlpa lpa', 'lpxa jiazhuangxianlvpaoai lvpaoai ftc', '恶性'],
      ['甲状腺嗜酸细胞癌', 'jzxssxba ssxba', 'shisuanxibaoai hurthle oca', '恶性'],
      ['甲状腺髓样癌 (MTC)', 'jzxsya sya', 'jiazhuangxiansuiyangai suiyangai mtc', '恶性'],
      ['高级别分化型甲状腺癌', 'gjbfhxjzxa', 'gaojibiefenhua dghgtc', '恶性'],
      ['低分化甲状腺癌 (PDTC)', 'dfhjzxa', 'dfha difenhua pdtc', '恶性'],
      ['甲状腺未分化癌（间变性癌 / ATC）', 'jzxwfha', 'wfha jbxa weifenhua jianbianxing atc', '恶性'],
      ['甲状腺原发性淋巴瘤', 'jzxyfxlbl', 'lbl linbaliu lymphoma', '恶性'],
      ['甲状腺转移癌', 'jzxzya', 'zya zhuanyiai metastasis', '恶性'],
      ['甲状旁腺癌', 'jzpxa', 'pxa jiazhuangpangxianai parathyroid carcinoma', '恶性'],
    ],
    '乳腺': [
      // 良性
      ['纤维腺瘤', 'xwxl', 'xianweixianliu fibroadenoma fa', '良性'],
      ['良性叶状肿瘤', 'lxyzzl', 'liangxingyezhuangzhongliu phyllodes', '良性'],
      ['导管内乳头状瘤', 'dgnrtzl', 'daoguanneirutouzhuangliu idp papilloma', '良性'],
      ['乳腺腺病（硬化性腺病）', 'rxxbyhxxb', 'ruxianxianbing yinghuaxingxianbing adenosis', '良性'],
      ['乳腺纤维囊性变（乳腺增生）', 'rxxwnxbrxzs', 'xianweinangxingbian ruxianzengsheng fcc', '良性'],
      ['乳腺错构瘤', 'rxcgl', 'cuogouliu hamartoma', '良性'],
      ['管状腺瘤', 'gzxl', 'guanzhuangxianliu tubular adenoma', '良性'],
      ['泌乳性腺瘤', 'mrxxl', 'miruxingxianliu lactating adenoma', '良性'],
      ['乳腺单纯囊肿', 'rxdcnz', 'danchunnangzhong cyst', '良性'],
      ['积乳囊肿', 'jrnz', 'jirunangzhong galactocele', '良性'],
      ['乳腺脂肪瘤', 'rxzfl', 'zhifangliu lipoma', '良性'],
      ['副乳腺', 'frx', 'furuxian accessory breast', '良性'],
      ['男性乳腺发育', 'nxrxfy', 'nanxingruxianfayu gynecomastia', '良性'],
      // 炎性
      ['肉芽肿性小叶性乳腺炎', 'ryzxxylrxy', 'rouyazhongxingruxianyan glm igm', '炎性'],
      ['浆细胞性乳腺炎（导管周围乳腺炎）', 'jxbxrxy', 'jiangxibaoxingruxianyan pdm', '炎性'],
      ['急性化脓性乳腺炎 / 乳腺脓肿', 'jxhnxrxyrxnz', 'ruxianyan ruxiannongzhong mastitis abscess', '炎性'],
      ['脂肪坏死', 'zfhs', 'zhifanghuaisi fat necrosis', '炎性'],
      // 交界 / 前驱
      ['交界性叶状肿瘤', 'jjxyzzl', 'jiaojiexingyezhuangzhongliu borderline phyllodes', '交界'],
      ['非典型导管增生 (ADH)', 'fdxdgzs', 'feidianxingdaoguanzengsheng adh', '交界'],
      ['非典型小叶增生 (ALH)', 'fdxxylzs', 'feidianxingxiaoyezengsheng alh', '交界'],
      ['放射状瘢痕 / 复杂性硬化性病变', 'fszbh', 'fangshezhuangbanhen radial scar', '良性'],
      ['导管原位癌 (DCIS)', 'dgywa', 'daoguanyuanweiai dcis', '恶性'],
      ['小叶原位癌 (LCIS)', 'xyywa', 'xiaoyeyuanweiai lcis', '交界'],
      // 恶性
      ['浸润性乳腺癌（非特殊类型 / NST / IDC）', 'jrrxaftslx', 'jrx jrxdga rxa dga jinrunxingruxianai jinrunxingdaoguanai idc nst', '恶性'],
      ['浸润性小叶癌 (ILC)', 'jrxxya', 'jinrunxingxiaoyeai ilc', '恶性'],
      ['黏液癌', 'nya', 'nianyeai mucinous carcinoma', '恶性'],
      ['管状癌', 'gza', 'guanzhuangai tubular carcinoma', '恶性'],
      ['浸润性微乳头状癌', 'jrxwrtza', 'weirutouzhuangai impc', '恶性'],
      ['浸润性乳头状癌', 'jrxrtza', 'rutouzhuangai', '恶性'],
      ['实性乳头状癌', 'sxrtza', 'shixingrutouzhuangai spc', '恶性'],
      ['包囊性乳头状癌', 'bnxrtza', 'baonangxingrutouzhuangai epc', '恶性'],
      ['化生性癌', 'hsa', 'huashengxingai metaplastic', '恶性'],
      ['大汗腺癌', 'dhxa', 'dahanxianai apocrine', '恶性'],
      ['伴髓样特征的浸润性癌', 'bsytz', 'suiyangai medullary', '恶性'],
      ['腺样囊性癌', 'xynxa', 'xianyangnangxingai acc', '恶性'],
      ['恶性叶状肿瘤', 'exyzzl', 'exingyezhuangzhongliu malignant phyllodes', '恶性'],
      ['乳头Paget病', 'rtpagetb', 'paget', '恶性'],
      ['炎性乳腺癌', 'yxrxa', 'yanxingruxianai ibc', '恶性'],
      ['乳腺淋巴瘤', 'rxlbl', 'linbaliu lymphoma', '恶性'],
      ['乳腺转移癌', 'rxzya', 'zhuanyiai metastasis', '恶性'],
      // 穿刺分级 (NHSBSP B1-B5)
      ['B1：正常组织 / 标本不满意', 'b1zczz', 'b1 normal', '穿刺'],
      ['B2：良性病变', 'b2lxbb', 'b2 benign', '穿刺'],
      ['B3：恶性潜能未定病变', 'b3exqnwd', 'b3 uncertain', '穿刺'],
      ['B4：可疑恶性', 'b4kyex', 'b4 suspicious', '穿刺'],
      ['B5a：原位癌', 'b5aywa', 'b5a dcis in situ', '穿刺'],
      ['B5b：浸润性癌', 'b5bjrxa', 'b5b invasive', '穿刺'],
    ],
    '肝脏': [
      ['肝海绵状血管瘤', 'ghmzxgl', 'xgl gxgl ganxueguanliu xueguanliu hemangioma', '良性'],
      ['局灶性结节性增生 (FNH)', 'jzxjjxzs', 'juzaoxingjiejie fnh', '良性'],
      ['肝细胞腺瘤 (HCA)', 'gxbxl', 'ganxibaoxianliu hca adenoma', '良性'],
      ['单纯性肝囊肿', 'dcxgnz', 'gnz nz gannangzhong cyst', '良性'],
      ['肝脓肿', 'gnz', 'gannongzhong abscess', '炎性'],
      ['肝血管平滑肌脂肪瘤 (AML)', 'gxgphjzfl', 'xueguanpinghuaji aml', '良性'],
      ['非均匀性脂肪肝 / 局灶性脂肪浸润', 'fjyxzfg', 'zfg zhifanggan zhifangjinrun steatosis', '良性'],
      ['肝炎性假瘤', 'gyxjl', 'yxjl yanxingjialiu ipt', '炎性'],
      ['肝硬化再生结节 (RN)', 'gyhzsjj', 'zsjj zaishengjiejie rn', '良性'],
      ['肝异型增生结节 (DN)', 'gyxzsjj', 'yixingzengsheng dn dysplastic', '交界'],
      ['肝包虫病', 'gbcb', 'baochongbing echinococcosis', '炎性'],
      ['肝细胞癌 (HCC)', 'gxba', 'ga ganxibaoai ganai hcc', '恶性'],
      ['肝内胆管细胞癌 (ICC)', 'gndgxba', 'danguanxibaoai icc cholangiocarcinoma', '恶性'],
      ['混合型肝细胞-胆管癌 (cHCC-CCA)', 'hhxgxbdga', 'hunhexing chcc cca', '恶性'],
      ['肝转移癌', 'gzya', 'ganzhuanyiai metastasis', '恶性'],
      ['肝母细胞瘤', 'gmxbl', 'ganmuxibaoliu hepatoblastoma', '恶性'],
      ['肝上皮样血管内皮瘤 (EHE)', 'gspyxg', 'shangpiyang ehe', '恶性'],
      ['肝血管肉瘤', 'gxgrl', 'xueguanrouliu angiosarcoma', '恶性'],
      ['肝原发性淋巴瘤', 'gyfxlbl', 'linbaliu lymphoma', '恶性'],
    ],
    '胆囊': [
      ['胆固醇性息肉', 'dgcxxr', 'danguchunxirou xirou polyp', '良性'],
      ['胆囊腺肌症', 'dnxjz', 'dannangxianjizheng adenomyomatosis', '良性'],
      ['胆囊腺瘤', 'dnxl', 'dannangxianliu adenoma', '良性'],
      ['慢性胆囊炎', 'mxdny', 'manxingdannangyan cholecystitis', '炎性'],
      ['急性胆囊炎', 'jxdny', 'jixingdannangyan', '炎性'],
      ['黄色肉芽肿性胆囊炎', 'hsryzxdny', 'huangserouyazhong xgc', '炎性'],
      ['胆囊腺癌', 'dnxa', 'dannangai dannangxianai gallbladder carcinoma', '恶性'],
      ['胆囊神经内分泌癌', 'dnsjnfma', 'shenjingneifenmi nec', '恶性'],
      ['胆囊腺鳞癌', 'dnxla', 'xianlinai adenosquamous', '恶性'],
    ],
    '胰腺': [
      ['胰腺导管腺癌 (PDAC)', 'yxdgxa', 'yixianai yixiandaoguan pdac', '恶性'],
      ['胰腺神经内分泌肿瘤 (PanNET)', 'yxsjnfmzl', 'shenjingneifenmi pannet pnet', '恶性'],
      ['胰腺实性假乳头状肿瘤 (SPN)', 'yxsxjrtzzl', 'shixingjiarutou spn spt', '交界'],
      ['导管内乳头状黏液性肿瘤 (IPMN)', 'dgnrtznyxzl', 'ipmn', '交界'],
      ['胰腺黏液性囊性肿瘤 (MCN)', 'yxnyxnxzl', 'nianyexingnangxing mcn', '交界'],
      ['胰腺浆液性囊腺瘤 (SCN)', 'yxjyxnxl', 'jiangyexingnangxianliu scn sca', '良性'],
      ['胰腺腺泡细胞癌', 'yxxpxba', 'xianpaoxibao acc', '恶性'],
      ['自身免疫性胰腺炎 (AIP)', 'zsmyxyxy', 'zishenmianyi aip', '炎性'],
      ['肿块型慢性胰腺炎', 'zkxmxyxy', 'zhongkuaixingyixianyan pancreatitis', '炎性'],
      ['胰腺假性囊肿', 'yxjxnz', 'jiaxingnangzhong pseudocyst', '良性'],
      ['胰腺转移癌', 'yxzya', 'zhuanyiai metastasis', '恶性'],
    ],
    '脾脏': [
      ['脾血管瘤', 'pxgl', 'pixueguanliu hemangioma', '良性'],
      ['脾错构瘤', 'pcgl', 'picuogouliu hamartoma', '良性'],
      ['脾淋巴管瘤', 'plbgl', 'pilinbaguanliu lymphangioma', '良性'],
      ['脾囊肿', 'pnz', 'pinangzhong cyst', '良性'],
      ['副脾', 'fp', 'fupi accessory spleen', '良性'],
      ['脾梗死', 'pgs', 'pigengsi infarction', '良性'],
      ['脾脓肿', 'pnz', 'pinongzhong abscess', '炎性'],
      ['脾淋巴瘤', 'plbl', 'pilinbaliu lymphoma', '恶性'],
      ['脾血管肉瘤', 'pxgrl', 'pixueguanrouliu angiosarcoma', '恶性'],
      ['脾转移癌', 'pzya', 'pizhuanyiai metastasis', '恶性'],
    ],
    '肾脏': [
      ['肾血管平滑肌脂肪瘤（错构瘤 / AML）', 'sxgphjzflcgl', 'cuogouliu shencuogouliu aml', '良性'],
      ['肾嗜酸细胞瘤', 'sssxb', 'shisuanxibaoliu oncocytoma', '良性'],
      ['单纯性肾囊肿', 'dcxsnz', 'shennangzhong cyst', '良性'],
      ['复杂性肾囊肿', 'fzxsnz', 'fuzashennangzhong bosniak', '良性'],
      ['后肾腺瘤', 'hsxl', 'houshenxianliu metanephric adenoma', '良性'],
      ['肾脓肿', 'snz', 'shennongzhong abscess', '炎性'],
      ['黄色肉芽肿性肾盂肾炎', 'hsryzxsysy', 'huangserouyazhong xgp', '炎性'],
      ['肾透明细胞癌 (ccRCC)', 'stmxba', 'shentoumingxibaoai shenai ccrcc rcc', '恶性'],
      ['乳头状肾细胞癌 (pRCC)', 'rtzsxba', 'rutouzhuangshenxibao prcc', '恶性'],
      ['嫌色细胞肾细胞癌 (chRCC)', 'xsxbsxba', 'xiansexibao chrcc', '恶性'],
      ['集合管癌', 'jhga', 'jiheguanai cdc', '恶性'],
      ['肾盂尿路上皮癌', 'synlspa', 'niaolushangpiai urothelial', '恶性'],
      ['肾母细胞瘤 (Wilms瘤)', 'smxbl', 'shenmuxibaoliu wilms', '恶性'],
      ['肾淋巴瘤', 'slbl', 'shenlinbaliu lymphoma', '恶性'],
      ['肾转移癌', 'szya', 'shenzhuanyiai metastasis', '恶性'],
    ],
    '膀胱': [
      ['尿路上皮癌（非肌层浸润性 / NMIBC）', 'nlspafjc', 'niaolushangpiai pangguangai nmibc', '恶性'],
      ['尿路上皮癌（肌层浸润性 / MIBC）', 'nlspajc', 'niaolushangpiai pangguangai mibc', '恶性'],
      ['低度恶性潜能乳头状尿路上皮肿瘤 (PUNLMP)', 'ddexqn', 'punlmp', '交界'],
      ['尿路上皮乳头状瘤', 'nlsprtzl', 'rutouzhuangliu papilloma', '良性'],
      ['膀胱腺癌', 'pgxa', 'pangguangxianai adenocarcinoma', '恶性'],
      ['膀胱鳞状细胞癌', 'pglzxba', 'linzhuangxibao scc', '恶性'],
      ['脐尿管癌', 'qnga', 'qiniaoguanai urachal', '恶性'],
      ['腺性膀胱炎', 'xxpgy', 'xianxingpangguangyan cystitis glandularis', '炎性'],
      ['慢性膀胱炎 / 炎性假瘤', 'mxpgy', 'pangguangyan cystitis', '炎性'],
    ],
    '前列腺': [
      ['良性前列腺增生 (BPH)', 'lxqlxzs', 'qianliexianzengsheng bph', '良性'],
      ['慢性前列腺炎 / 肉芽肿性前列腺炎', 'mxqlxy', 'qianliexianyan prostatitis', '炎性'],
      ['前列腺腺泡腺癌', 'qlxxpxa', 'qianliexianai gleason pca', '恶性'],
      ['前列腺导管腺癌', 'qlxdgxa', 'daoguanxianai ductal', '恶性'],
      ['高级别前列腺上皮内瘤变 (HGPIN)', 'gjbqlxspnlb', 'hgpin pin', '交界'],
      ['非典型小腺泡增生 (ASAP)', 'fdxxxpzs', 'asap', '交界'],
      ['前列腺神经内分泌癌', 'qlxsjnfma', 'shenjingneifenmi nepc', '恶性'],
    ],
    '子宫附件': [
      // 子宫
      ['子宫平滑肌瘤（子宫肌瘤）', 'zgphjlzgjl', 'zigongjiliu myoma leiomyoma', '良性'],
      ['子宫腺肌病 / 腺肌瘤', 'zgxjb', 'xianjibing xianjiliu adenomyosis', '良性'],
      ['子宫内膜息肉', 'zgnmxr', 'neimoxirou polyp', '良性'],
      ['子宫内膜增生（无不典型性）', 'zgnmzs', 'neimozengsheng hyperplasia', '良性'],
      ['子宫内膜不典型增生', 'zgnmbdxzs', 'budianxingzengsheng ein ah', '交界'],
      ['子宫内膜样癌', 'zgnmya', 'neimoai zigongneimoai endometrial', '恶性'],
      ['子宫浆液性癌', 'zgjyxa', 'jiangyexingai serous', '恶性'],
      ['子宫癌肉瘤', 'zgarl', 'airouliu carcinosarcoma', '恶性'],
      ['子宫平滑肌肉瘤', 'zgphjrl', 'pinghuajirouliu lms', '恶性'],
      ['子宫内膜间质肉瘤', 'zgnmjzrl', 'jianzhirouliu ess', '恶性'],
      ['宫颈鳞状细胞癌', 'gjlzxba', 'gongjingai linai scc', '恶性'],
      ['宫颈腺癌', 'gjxa', 'gongjingxianai adenocarcinoma', '恶性'],
      ['葡萄胎 / 妊娠滋养细胞肿瘤', 'ptt', 'putaotai rszx gtn', '交界'],
      // 卵巢与附件
      ['卵巢浆液性囊腺瘤', 'lcjyxnxl', 'jiangyexingnangxianliu serous cystadenoma', '良性'],
      ['卵巢浆液性交界性肿瘤', 'lcjyxjjxzl', 'jiangyexingjiaojie sbot', '交界'],
      ['卵巢高级别浆液性癌 (HGSC)', 'lcgjbjyxa', 'gaojibiejiangye hgsc', '恶性'],
      ['卵巢低级别浆液性癌 (LGSC)', 'lcdjbjyxa', 'dijibiejiangye lgsc', '恶性'],
      ['卵巢黏液性囊腺瘤', 'lcnyxnxl', 'nianyexingnangxianliu mucinous cystadenoma', '良性'],
      ['卵巢黏液性交界性肿瘤', 'lcnyxjjxzl', 'nianyexingjiaojie mbot', '交界'],
      ['卵巢黏液性癌', 'lcnyxa', 'nianyexingai mucinous carcinoma', '恶性'],
      ['卵巢子宫内膜异位囊肿（巧克力囊肿）', 'qklns', 'qiaokelinangzhong endometrioma', '良性'],
      ['卵巢成熟性畸胎瘤（皮样囊肿）', 'csxjtlpynz', 'jitailiu piyangnangzhong teratoma dermoid', '良性'],
      ['卵巢未成熟畸胎瘤', 'wcsjtl', 'weichengshujitailiu immature teratoma', '恶性'],
      ['卵巢子宫内膜样癌', 'lczgnmya', 'neimoyangai endometrioid', '恶性'],
      ['卵巢透明细胞癌', 'lctmxba', 'toumingxibaoai clear cell', '恶性'],
      ['卵巢纤维瘤 / 卵泡膜细胞瘤', 'lcxwllpm', 'xianweiliu luanpaomo fibroma thecoma', '良性'],
      ['卵巢颗粒细胞瘤', 'lcklxbl', 'kelixibaoliu granulosa', '交界'],
      ['黄体囊肿 / 滤泡囊肿', 'htnz', 'huangtinangzhong lvpaonangzhong corpus luteum', '良性'],
      ['卵巢转移癌 (Krukenberg瘤)', 'lczya', 'zhuanyiai krukenberg', '恶性'],
      ['输卵管积水 / 输卵管卵巢脓肿 (TOA)', 'slgjs', 'shuluanguannongzhong toa', '炎性'],
    ],
    '浅表淋巴结': [
      ['反应性淋巴结增生', 'fyxlbjzs', 'fanyingxingzengsheng reactive', '良性'],
      ['淋巴结转移性乳头状癌', 'lbjzyxrtza', 'zhuanyiai rutouzhuangai metastasis ptc', '恶性'],
      ['淋巴结转移性鳞状细胞癌', 'lbjzyxlzxba', 'zhuanyiai linai scc metastasis', '恶性'],
      ['淋巴结转移性腺癌', 'lbjzyxxa', 'zhuanyiai xianai adenocarcinoma metastasis', '恶性'],
      ['淋巴结转移癌（未明确来源）', 'lbjzya', 'linbajiezhuanyiai metastasis', '恶性'],
      ['淋巴结结核', 'lbjjh', 'linbajiejiehe tuberculosis tb', '炎性'],
      ['组织细胞坏死性淋巴结炎 (Kikuchi病)', 'hsxlbjy', 'huaisixinglinbajieyan kikuchi', '炎性'],
      ['化脓性淋巴结炎', 'hnxlbjy', 'huanongxinglinbajieyan lymphadenitis', '炎性'],
      ['猫抓病性淋巴结炎', 'mzb', 'maozhuabing cat scratch', '炎性'],
      ['霍奇金淋巴瘤 (HL)', 'hqjlbl', 'huoqijin hl hodgkin', '恶性'],
      ['弥漫大B细胞淋巴瘤 (DLBCL)', 'mmdbxb', 'mimandab dlbcl lymphoma', '恶性'],
      ['滤泡性淋巴瘤 (FL)', 'lpxlbl', 'lvpaoxinglinbaliu fl', '恶性'],
      ['套细胞淋巴瘤 (MCL)', 'txblbl', 'taoxibao mcl', '恶性'],
      ['边缘区淋巴瘤 (MZL)', 'byqlbl', 'bianyuanqu mzl malt', '恶性'],
      ['T细胞淋巴瘤', 'txblbl', 'txibaolinbaliu tcell', '恶性'],
      ['Castleman病（巨大淋巴结增生）', 'castleman', 'castleman judalinbajie', '良性'],
    ],
    '肌骨': [
      ['脂肪瘤', 'zfl', 'zhifangliu lipoma', '良性'],
      ['血管瘤 / 血管畸形', 'xgl', 'xueguanliu xueguanjixing hemangioma', '良性'],
      ['神经鞘瘤（施万细胞瘤）', 'sjql', 'shenjingqiaoliu schwannoma', '良性'],
      ['神经纤维瘤', 'sjxwl', 'shenjingxianweiliu neurofibroma', '良性'],
      ['腱鞘巨细胞瘤', 'jqjxbl', 'jianqiaojuxibaoliu gctts', '良性'],
      ['腱鞘囊肿', 'jqnz', 'jianqiaonangzhong ganglion cyst', '良性'],
      ['腘窝囊肿 (Baker囊肿)', 'gwnz', 'guowonangzhong baker', '良性'],
      ['表皮样囊肿（皮脂腺囊肿）', 'bpynzpzxnz', 'biaopiyangnangzhong pizhixian epidermoid', '良性'],
      ['毛母质瘤（钙化上皮瘤）', 'mmzlghspl', 'maomuzhiliu gaihuashangpiliu pilomatricoma', '良性'],
      ['血管球瘤', 'xgql', 'xueguanqiuliu glomus', '良性'],
      ['韧带样型纤维瘤病', 'rdyxxwlb', 'rendaiyang xianweiliubing desmoid', '交界'],
      ['滑膜软骨瘤病', 'hmrglb', 'huamoruanguliu synovial chondromatosis', '良性'],
      ['痛风石', 'tfs', 'tongfengshi tophus gout', '炎性'],
      ['滑膜炎 / 腱鞘炎', 'hmyjqy', 'huamoyan jianqiaoyan synovitis', '炎性'],
      ['软组织脓肿 / 血肿', 'rzznzxz', 'nongzhong xuezhong abscess hematoma', '炎性'],
      ['脂肪肉瘤', 'zfrl', 'zhifangrouliu liposarcoma', '恶性'],
      ['滑膜肉瘤', 'hmrl', 'huamorouliu synovial sarcoma', '恶性'],
      ['未分化多形性肉瘤 (UPS)', 'wfhdx', 'weifenhuaduoxing ups mfh', '恶性'],
      ['平滑肌肉瘤', 'phjrl', 'pinghuajirouliu leiomyosarcoma', '恶性'],
      ['恶性周围神经鞘瘤 (MPNST)', 'exzwsjql', 'mpnst', '恶性'],
      ['隆突性皮肤纤维肉瘤 (DFSP)', 'ltxpfxwrl', 'dfsp', '交界'],
      ['软组织转移癌', 'rzzzya', 'zhuanyiai metastasis', '恶性'],
    ],
    '阴囊': [
      ['精原细胞瘤', 'jyxbl', 'jingyuanxibaoliu seminoma', '恶性'],
      ['胚胎性癌', 'ptxa', 'peitaixingai embryonal', '恶性'],
      ['卵黄囊瘤', 'lhnl', 'luanhuangnangliu yolk sac', '恶性'],
      ['睾丸畸胎瘤', 'gwjtl', 'gaowanjitailiu teratoma', '恶性'],
      ['绒毛膜癌', 'rmma', 'rongmaomoai choriocarcinoma', '恶性'],
      ['混合性生殖细胞肿瘤', 'hhxszxbzl', 'hunhexingshengzhi mgct', '恶性'],
      ['睾丸间质细胞瘤 (Leydig细胞瘤)', 'gwjzxbl', 'jianzhixibao leydig', '良性'],
      ['支持细胞瘤 (Sertoli细胞瘤)', 'zcxbl', 'zhichixibao sertoli', '良性'],
      ['睾丸淋巴瘤', 'gwlbl', 'gaowanlinbaliu lymphoma', '恶性'],
      ['睾丸表皮样囊肿', 'gwbpynz', 'biaopiyangnangzhong epidermoid', '良性'],
      ['附睾腺瘤样瘤', 'fgxlyl', 'fugao xianliuyangliu adenomatoid', '良性'],
      ['附睾囊肿 / 精液囊肿', 'fgnz', 'fugaonangzhong spermatocele', '良性'],
      ['急性附睾睾丸炎', 'jxfggwy', 'fugaoyan gaowanyan epididymitis', '炎性'],
      ['附睾结核', 'fgjh', 'fugaojiehe tuberculosis', '炎性'],
      ['睾丸鞘膜积液', 'gwqmjy', 'qiaomojiye hydrocele', '良性'],
      ['精索静脉曲张', 'jsjmqz', 'jingsuojingmaiquzhang varicocele', '良性'],
    ],
    '涎腺': [
      ['多形性腺瘤（混合瘤）', 'dxxxlhhl', 'duoxingxingxianliu hunheliu pleomorphic adenoma', '良性'],
      ['Warthin瘤（腺淋巴瘤）', 'warthinxlbl', 'warthin xianlinbaliu', '良性'],
      ['基底细胞腺瘤', 'jdxbxl', 'jidixibaoxianliu basal cell adenoma', '良性'],
      ['肌上皮瘤', 'jspl', 'jishangpiliu myoepithelioma', '良性'],
      ['黏液表皮样癌', 'nybpya', 'nianyebiaopiyangai mec', '恶性'],
      ['腺样囊性癌', 'xynxa', 'xianyangnangxingai acc', '恶性'],
      ['腺泡细胞癌', 'xpxba', 'xianpaoxibaoai acinic', '恶性'],
      ['涎腺导管癌', 'xxdga', 'xianxiandaoguanai sdc', '恶性'],
      ['慢性涎腺炎 / 涎石病', 'mxxxy', 'xianxianyan saiexianyan sialadenitis', '炎性'],
      ['干燥综合征 / 淋巴上皮病变', 'gzzhz', 'ganzaozonghezheng sjogren', '炎性'],
      ['鳃裂囊肿', 'slnz', 'sailienangzhong branchial cleft cyst', '良性'],
    ],
  };

  function matchOrgan(bodyPart) {
    const s = String(bodyPart || '').trim();
    if (!s) return '';
    if (DICT[s]) return s;
    for (const [organ, re] of ORGAN_RULES) if (re.test(s)) return organ;
    return '';
  }

  function scoreItem(item, q, isBiopsy, isSameOrgan) {
    const [name, py, kw, cat] = item;
    let sc = 0;
    if (!q) {
      sc = 10;
      if (isBiopsy && cat === '穿刺') sc += 30;
      if (!isBiopsy && cat === '穿刺') sc -= 5;
      return sc;
    }
    const nl = name.toLowerCase();
    const pys = (py || '').toLowerCase().split(/\s+/).filter(Boolean);
    const kwl = (kw || '').toLowerCase();
    if (nl === q || pys.includes(q)) sc = 100;
    else if (nl.startsWith(q) || pys.some((p) => p.startsWith(q))) sc = 85;
    else if (kwl.split(/\s+/).some((w) => w.startsWith(q))) sc = 75;
    else if (nl.includes(q)) sc = 65;
    else if (pys.some((p) => p.includes(q))) sc = 55;
    else if (kwl.includes(q)) sc = 45;
    else {
      // 顺序子序列匹配拼音首字母
      const hit = pys.some((p) => {
        let i = 0;
        for (const ch of p) if (ch === q[i]) { i++; if (i === q.length) return true; }
        return false;
      });
      if (hit && q.length >= 3) sc = 30;
    }
    if (!sc) return 0;
    if (isSameOrgan) sc += 40;
    if (isBiopsy && cat === '穿刺') sc += 8;
    return sc;
  }

  function search(query, bodyPart, opts = {}) {
    const q = String(query || '').trim().toLowerCase();
    const organ = matchOrgan(bodyPart);
    const isBiopsy = !!opts.isBiopsy;
    const history = opts.history || [];
    const results = [];
    const seen = new Set();

    const push = (item, org, same) => {
      if (seen.has(item[0])) return;
      const sc = scoreItem(item, q, isBiopsy, same);
      if (sc > 0) {
        seen.add(item[0]);
        results.push({ name: item[0], cat: item[3] || '', organ: org, sc });
      }
    };

    // 1. 当前部位词库
    if (organ && DICT[organ]) {
      DICT[organ].forEach((it) => push(it, organ, true));
    }
    // 2. 历史录入词（同部位优先）
    history.forEach((h) => {
      const same = !!organ && matchOrgan(h.body_part) === organ;
      if (!q && organ && !same) return;
      push([h.val, '', '', '常用'], h.body_part || '', same);
    });
    // 3. 未选部位，或输入了>=1个字符但本部位候选较少时，补充全器官词库
    if (!organ || (q && results.length < 6)) {
      for (const [org, list] of Object.entries(DICT)) {
        if (org === organ) continue;
        if (!q && organ) continue;
        list.forEach((it) => push(it, org, false));
      }
    }

    results.sort((a, b) => b.sc - a.sc);
    return { organ, items: results.slice(0, 18) };
  }

  return { DICT, matchOrgan, search };
})();
