import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).resolve().parent
url = (HERE.parent / "index.html").as_uri()
async def shot(pg, name): await pg.screenshot(path=str(HERE / f"{name}.jpg"), quality=72)
async def click_text(pg, text):
    b = pg.get_by_role("button", name=text, exact=False).first
    await b.click(timeout=4000)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="msedge", headless=True); pg = await b.new_page(viewport={"width":1280,"height":900})
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
        await pg.goto(url); await pg.wait_for_timeout(1500); await shot(pg, "01_open")
        await click_text(pg, "Start the search"); await pg.wait_for_timeout(3000); await shot(pg, "02_searching")
        await pg.wait_for_timeout(20000); await shot(pg, "03_ambiguous")
        await click_text(pg, "Look closer"); await pg.wait_for_timeout(6000); await shot(pg, "04_looking_closer")
        await pg.wait_for_timeout(28000); await shot(pg, "05_settled_after")
        try:
            await click_text(pg, "Before"); await pg.wait_for_timeout(600); await shot(pg, "06_before_toggle"); await click_text(pg, "After"); await pg.wait_for_timeout(600)
        except Exception as e: print("toggle:", e)
        await click_text(pg, "Show what was missed"); await pg.wait_for_timeout(1500); await shot(pg, "07_missed_shown")
        await pg.evaluate("window.openClusterZoom('u47')"); await pg.wait_for_timeout(900); await shot(pg, "08_zoom_cycle")
        try:
            await click_text(pg, "Follow the money"); await pg.wait_for_timeout(300)
            pts = await pg.evaluate("Array.from(document.querySelectorAll('#zoomOverlay circle, .zoom-node, [data-acct]')).slice(0,2).map(e=>{const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})")
            print("nodes:", pts[:2])
            if len(pts)>=2:
                await pg.mouse.click(*pts[0]); await pg.wait_for_timeout(200); await pg.mouse.click(*pts[1]); await pg.wait_for_timeout(800)
            await shot(pg, "09_follow_the_money")
        except Exception as e: print("follow:", e)
        print("errors:", errs[:5]); await b.close()
asyncio.run(main())
