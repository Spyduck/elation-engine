cmd_Release/obj.target/canvas.node := flock ./Release/linker.lock g++ -shared -pthread -rdynamic -m64  -Wl,-soname=canvas.node -o Release/obj.target/canvas.node -Wl,--start-group Release/obj.target/canvas/src/Canvas.o Release/obj.target/canvas/src/CanvasGradient.o Release/obj.target/canvas/src/CanvasPattern.o Release/obj.target/canvas/src/CanvasRenderingContext2d.o Release/obj.target/canvas/src/color.o Release/obj.target/canvas/src/Image.o Release/obj.target/canvas/src/ImageData.o Release/obj.target/canvas/src/init.o Release/obj.target/canvas/src/PixelArray.o Release/obj.target/canvas/src/FontFace.o -Wl,--end-group -lpixman-1 -lcairo -lpng12 -lpangocairo-1.0 -lpango-1.0 -lgobject-2.0 -lglib-2.0 -ljpeg -lgif
