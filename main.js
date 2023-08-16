// ==UserScript==
// @name                BiliBili-TextSearchList
// @name:zh-CN          BiliBili-文字搜索列表
// @namespace           https://github.com/Mehver
// @version             bata
// @description         (Thanks to ZEP's paid customization) Display Bilibili search results in a text list, which is convenient for sorting by each column.
// @description:zh-CN   (感谢闲鱼买家ZEP的有偿定制) 用文字列表的方式展示B站搜索结果，方便按各列排序。
// @sponsor             ZEP
// @author              https://github.com/Mehver
// @icon
// @match               http*://search.bilibili.com/*
// @license             MPL-2.0
// @license^            Mozilla Public License 2.0
// @charset		        UTF-8
// @homepageURL         https://github.com/SynRGB/BiliBili-TextSearchList
// @contributionURL     https://github.com/SynRGB/BiliBili-TextSearchList
// @copyright           Copyright © 2022-PRESENT, Mehver (https://github.com/Mehver)
// @grant               GM_addStyle
// @grant               GM_getResourceText
// @grant               GM_getValue
// @grant               GM_setValue
// @grant               GM_registerMenuCommand
// @resource            DataTablesCSS https://cdn.datatables.net/1.11.3/css/jquery.dataTables.min.css
// ==/UserScript==

let table_font_size = await GM_getValue('table_font_size', 16);

GM_registerMenuCommand('设置表格字体大小', async () => {
    let newFontSize = prompt('请输入新的字体大小（单位px）:', table_font_size);
    if (newFontSize) {
        table_font_size = newFontSize;
        await GM_setValue('table_font_size', table_font_size);
        alert('字体大小已更新！请刷新页面以查看更改。');
    }
});

//////////////////////////////////////
//////////// DataTables //////////////
let cssTxt = GM_getResourceText("DataTablesCSS");
GM_addStyle(cssTxt);
let head = document.head || document.getElementsByTagName('head')[0];
let link = document.createElement('link');
link.type = 'text/css';
link.rel = 'stylesheet';
link.href = 'https://cdn.datatables.net/1.11.3/css/jquery.dataTables.min.css';
head.appendChild(link);
(function() {
    let jQueryScript = document.createElement("script");
    jQueryScript.src = "https://code.jquery.com/jquery-3.6.0.min.js";
    jQueryScript.onload = () => {
        let dtScript = document.createElement("script");
        dtScript.src = "https://cdn.datatables.net/1.11.3/js/jquery.dataTables.min.js";
        // 加载完成后首次运行
        dtScript.onload = () => {
            main();
        };
        document.body.appendChild(dtScript);
    };
    document.body.appendChild(jQueryScript);
})();
//////////// DataTables //////////////
//////////////////////////////////////

//////////////////////////////////////
/////////////// 触发器 ////////////////
// 延时避免在 dtScript 和 jQueryScript 加载完成前就运行
setTimeout(function() {
    // if DOM changed, re-run the script
    let observer = new window.MutationObserver(function (mutations) {
        mutations.forEach(function () {
            const biliResultsTable = document.querySelector('#biliResultsTable');
            if (biliResultsTable === null) {
                main();
            }
        });
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}, 1000);
/////////////// 触发器 ////////////////
//////////////////////////////////////

/////////////////////////////////////
/////////////// main ////////////////
function main() {
    // Create table with thead for DataTables
    let table = document.createElement('table');
    table.id = "biliResultsTable";
    let thead = document.createElement('thead');
    let tbody = document.createElement('tbody');
    let header = ["发布日期", "时长", "标题", "播放量", "UP主"];
    let trHead = document.createElement('tr');
    header.forEach(text => {
        let th = document.createElement('th');
        th.textContent = text;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    setTimeout(function() {
        let videoCards = document.querySelectorAll('.bili-video-card');
        videoCards.forEach(videoCard => {
            let title = videoCard.querySelector('.bili-video-card__info--tit')?.textContent.trim();
            let up = videoCard.querySelector('.bili-video-card__info--author')?.textContent.trim();
            let playCount = videoCard.querySelector('.bili-video-card__stats--item > span')?.textContent.trim();
            let danmakuCount = videoCard.querySelectorAll('.bili-video-card__stats--item > span')[1]?.textContent.trim();
            let duration = videoCard.querySelector('.bili-video-card__stats__duration')?.textContent.trim();
            let date = videoCard.querySelector('.bili-video-card__info--date')?.textContent.trim().replace('· ', '');
            let link_video = videoCard.querySelectorAll('a')[0].getAttribute('href');
            // UP主的link在targetDiv1页面有概率玄学报错，应该是异步逻辑的问题，用try之后基本正常
            let link_up;
            try { link_up = videoCard.querySelectorAll('a')[2].getAttribute('href'); } catch (e) {}

            let tr = document.createElement('tr');

            // 确保没有为空的数据
            if (
                (title !== undefined) &&
                (up !== undefined) &&
                (playCount !== undefined) &&
                (danmakuCount !== undefined) &&
                (duration !== undefined) &&
                (date !== undefined) &&
                (link_video !== undefined)
            ) {
                [date, duration, title, playCount, up].forEach(text => {
                    let td = document.createElement('td');
                    td.textContent = text;
                    tr.appendChild(td);
                });
                let tdTitle = tr.querySelector('td:nth-child(3)');
                tdTitle.innerHTML = `<a href="${link_video}" target="_blank">${title}</a>`;
                let tdUp = tr.querySelector('td:nth-child(5)');
                tdUp.innerHTML = `<a href="${link_up}" target="_blank">${up}</a>`;
                // b230815.02 时长加粗
                tr.querySelector('td:nth-child(2)').style.fontWeight = 'bold';
                // b230815.02 标题用 `#00AEEC` 颜色
                tr.querySelector('td:nth-child(3)').style.color = '#00AEEC';
                tbody.appendChild(tr);
            }
        });
        // console.log(videoCards);
        table.appendChild(thead);
        table.appendChild(tbody);

        // 回调获取异步数据，适用于下方 targetDiv2 的异步加载
        if (tbody.childElementCount === 0) {
            main();
            return;
        }

        // 搜索第一页的 DOM 结构与其他页不同，直接用这种方式即可匹配
        let targetDiv1 = document.querySelector("#i_cecream > div > div:nth-child(2) > div.search-content.search-content--gray > div > div > div > div.video.i_wrapper.search-all-list");
        if (targetDiv1 !== null) {
            targetDiv1.innerHTML = '';
            targetDiv1.appendChild(table);
        } else {
            // 匹配除第一页外的其他 DOM 结构，第一页返回的结果是一次性全部加载的，而其他页是异步加载的
            let targetDiv2_rm = document.querySelector("#i_cecream > div > div:nth-child(2) > div.search-content--gray.search-content > div > div > div.video-list.row");
            targetDiv2_rm.innerHTML = '';
            let targetDiv2_bott = document.querySelector("#i_cecream > div > div:nth-child(2) > div.search-content--gray.search-content > div > div > div.flex_center.mt_x50.mb_lg");
            targetDiv2_bott.parentNode.insertBefore(table, targetDiv2_bott);
            // 每次翻页时，上一页的表格不会自动被覆盖而是叠加在一起，所以需要手动删除
            let tables = document.querySelectorAll('#biliResultsTable');
            if (tables.length > 1) {
                tables.forEach(table => {
                    if (table !== tables[0]) {
                        table.remove();
                    }
                });
            }
        }


        // DataTables 的自定义排序算法
        $.fn.dataTable.ext.type.order['duration-sort-pre'] = function (d) {return convertDurationToSeconds(d);};
        $.fn.dataTable.ext.type.order['playcount-sort-pre'] = function (d) {return convertPlayCount(d);};
        $.fn.dataTable.ext.type.order['date-sort-pre'] = function (d) {return convertDate(d);};
        // Initialize DataTables
        $(table).DataTable({
            "paging": false,
            "searching": false,
            "info": false,
            "columnDefs": [
                { "type": "playcount-sort", "targets": 3 },
                { "type": "duration-sort", "targets": 1 },
                { "type": "date-sort", "targets": 0 }
            ]
        });

        // b230815.02 去掉底边横线
        GM_addStyle("table.dataTable.no-footer { border-bottom: 0px none !important; }");
        // b230815.02 去掉表头横线 (因CSS复杂，所以创建白色色块覆盖)
        GM_addStyle(".dataTable thead th { border-bottom: 0px none !important; }");
        // b230815.02 调大字号
        GM_addStyle(`.dataTable { font-size: ${table_font_size}px !important; }`);

    }, 100);
}
/////////////// main ////////////////
/////////////////////////////////////

///////////////////////////////////
/////// DataTable 的排序算法 ////////
function convertDurationToSeconds(duration) {
    let parts = duration.split(':').map(part => parseInt(part, 10));
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else {
        return NaN;
    }
}
function convertPlayCount(playCount) {
    if (playCount.includes('万')) {
        return parseFloat(playCount.replace('万', '')) * 10000;
    } else {
        return parseInt(playCount, 10);
    }
}
function convertDate(date) {
    const now = new Date();
    if (date.includes('小时前')) {
        const hoursAgo = parseFloat(date.replace('小时前', ''));
        return now - hoursAgo * 3600 * 1000; // Convert hours to milliseconds
    }
    if (date === "昨天") {
        return now - 24 * 3600 * 1000; // 24 hours in milliseconds
    }
    if (date.includes('-')) {
        const parts = date.split('-').map(part => {
            return part.padStart(2, '0');
        });
        // If only month and day are given, use the current year.
        if (parts.length === 2) {
            parts.unshift(now.getFullYear().toString());
        }
        // Create a new Date object and return its time value in milliseconds
        return new Date(parts.join('-')).getTime();
    }
}
/////// DataTable 的排序算法 ////////
///////////////////////////////////

console.log("JS script BiliBili-TextSearchList (BiliBili-文字搜索列表) loaded. See more details at https://github.com/SynRGB/BiliBili-TextSearchList");
