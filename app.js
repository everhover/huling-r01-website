const scenes = [
  { title: '好点子来了，\n不用重新打开手机。', copy: '关灯之后，忽然想到一个新方向。双击戒指，轻声说出，再双击结束。让想法留下，让休息继续。', quote: '“下次产品分享，可以从用户的一天讲起。”', type: '灵感记录', result: '从用户的一天，讲产品故事', detail: '为下一次产品分享保留一个叙事方向。', foot: '已整理到记录 ↗' },
  { title: '出门前想到的，\n也一起带走。', copy: '收拾包、找钥匙，脑海里又冒出几件要做的事。说给乎零听，稍后在 App 里查看，让忙碌的早晨有条理一点。', quote: '“今天记得回复设计稿，再预约周末的洗衣服务。”', type: '待办整理', result: '今天想完成的两件事', detail: '回复设计稿 · 预约周末洗衣服务', foot: '已整理到待办 ↗' },
  { title: '记住一件小事，\n继续眼前的陪伴。', copy: '陪孩子玩的时候，家人交代了一件事。双击，复述一句，让事情留下，也让相处的时刻继续。', quote: '“明天回家前，记得买牛奶和面包。”', type: '生活待办', result: '明天回家前，补充家里的早餐', detail: '采购清单 · 牛奶、面包', foot: '已整理到待办 ↗' }
];
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectScene(index) {
  const scene = scenes[index];
  tabs.forEach((tab, position) => {
    tab.setAttribute('aria-selected', String(position === index));
    tab.tabIndex = position === index ? 0 : -1;
  });
  document.querySelector('#demo-panel').setAttribute('aria-labelledby', `tab-${index}`);
  document.querySelector('#scene-title').innerText = scene.title;
  document.querySelector('#scene-copy').textContent = scene.copy;
  document.querySelector('#utterance').textContent = scene.quote;
  document.querySelector('#result-type').textContent = scene.type;
  document.querySelector('#result-title').textContent = scene.result;
  document.querySelector('#result-copy').textContent = scene.detail;
  document.querySelector('.result-foot').textContent = scene.foot;
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectScene(index));
  tab.addEventListener('keydown', event => {
    const destinations = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
    if (Object.hasOwn(destinations, event.key)) {
      event.preventDefault();
      const next = destinations[event.key];
      selectScene(next);
      tabs[next].focus();
    }
  });
});
