# FTE Web Bundler

This is a tool to help you develop and continuosly deploy your FTE QuakeWorld (https://fte.triptohell.info/ and https://fteqw.org/) games/mods in the web browser. There is a web build of FTE out there already but unfortunately emscripten and browsers are tricky, so not everything that works on desktop will work in the browser, this is why it's crucial to be able to constantly test everything as you develop. To prove the worth of this tool, I made my Ludum Dare 49 Compo entry targeting web as the primary platform, using FTE Web Bundler to make it possible at all. You can check the results here: https://shp.itch.io/celestial-heights

What this tool actually does is it monitors your game files for changes, packages everything together, and then serves the game on a local web server for testing. It even automatically reloads the page whenever new changes are ready. This allows you to keep the browser page in the background and it'll be ready for testing just seconds after you hit compile in your QuakeC compiler.

## Getting started

This tool is written in Javascript and runs on Node using the Express framework to keep the code minimal. You'll need both node and npm to use the tool.

- First install the dependencies using `npm i`

- This repo does not contain the actual FTE web build to free it from GPL license.You'll have to get it yourself, either from https://fte.triptohell.info/moodles/web or by building the engine yourself with emscripten if you really know what you're doing (I don't). You'll need the following files `ftewebgl.html`, `ftewebgl.js` and `ftewebgl.wasm`. You'll need to put them in the `/fte` directory. 

- Your game project doesn't need to be in the same directory as FTE Web Bundler as the path to it is given via arguments. Your project needs to have a .fmf file, the script expects a `default.fmf` in the same directory where your fteqw binary would normally reside.

- Launch the script using `node index.js <path-to-game-directory>` in my setup it was `node index.js ../ld49/game`, as my project directory (ld49) was on the same level as the ftewebbundler directory. Note that you need to pass the game directory, so not just the project directory. In vanilla quake this would be `id1`, in my templates it's always `game`.

- If everything went right, navigate to `http://localhost:8000` in your preferred browser and it should have the FTE Web Developer frame with the game in the middle. After this any changes to progs.dat, qwprogs.dat, csprogs.dat or menu.dat will update the bundle, note that currently no other files are monitored so changing art alone won't trigger a change, you'll need to hit compile again. 
