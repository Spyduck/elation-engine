# This file is generated by gyp; do not edit.

TOOLSET := target
TARGET := canvas
DEFS_Debug := \
	'-D_LARGEFILE_SOURCE' \
	'-D_FILE_OFFSET_BITS=64' \
	'-DHAVE_FREETYPE' \
	'-DHAVE_PANGO' \
	'-DHAVE_JPEG' \
	'-DHAVE_GIF' \
	'-DBUILDING_NODE_EXTENSION' \
	'-DDEBUG' \
	'-D_DEBUG'

# Flags passed to all source files.
CFLAGS_Debug := \
	-fPIC \
	-Wall \
	-Wextra \
	-Wno-unused-parameter \
	-pthread \
	-m64 \
	-g \
	-O0

# Flags passed to only C files.
CFLAGS_C_Debug :=

# Flags passed to only C++ files.
CFLAGS_CC_Debug := \
	-fno-rtti \
	-fno-exceptions

INCS_Debug := \
	-I/usr/include/nodejs/src \
	-I/usr/include/nodejs/deps/uv/include \
	-I/usr/include/nodejs/deps/v8/include \
	-I$(srcdir)/node_modules/nan \
	-I/usr/include/cairo \
	-I/usr/include/glib-2.0 \
	-I/usr/lib/x86_64-linux-gnu/glib-2.0/include \
	-I/usr/include/pixman-1 \
	-I/usr/include/freetype2 \
	-I/usr/include/libpng12 \
	-I/usr/include/pango-1.0

DEFS_Release := \
	'-D_LARGEFILE_SOURCE' \
	'-D_FILE_OFFSET_BITS=64' \
	'-DHAVE_FREETYPE' \
	'-DHAVE_PANGO' \
	'-DHAVE_JPEG' \
	'-DHAVE_GIF' \
	'-DBUILDING_NODE_EXTENSION'

# Flags passed to all source files.
CFLAGS_Release := \
	-fPIC \
	-Wall \
	-Wextra \
	-Wno-unused-parameter \
	-pthread \
	-m64 \
	-O2 \
	-fno-strict-aliasing \
	-fno-tree-vrp \
	-fno-omit-frame-pointer

# Flags passed to only C files.
CFLAGS_C_Release :=

# Flags passed to only C++ files.
CFLAGS_CC_Release := \
	-fno-rtti \
	-fno-exceptions

INCS_Release := \
	-I/usr/include/nodejs/src \
	-I/usr/include/nodejs/deps/uv/include \
	-I/usr/include/nodejs/deps/v8/include \
	-I$(srcdir)/node_modules/nan \
	-I/usr/include/cairo \
	-I/usr/include/glib-2.0 \
	-I/usr/lib/x86_64-linux-gnu/glib-2.0/include \
	-I/usr/include/pixman-1 \
	-I/usr/include/freetype2 \
	-I/usr/include/libpng12 \
	-I/usr/include/pango-1.0

OBJS := \
	$(obj).target/$(TARGET)/src/Canvas.o \
	$(obj).target/$(TARGET)/src/CanvasGradient.o \
	$(obj).target/$(TARGET)/src/CanvasPattern.o \
	$(obj).target/$(TARGET)/src/CanvasRenderingContext2d.o \
	$(obj).target/$(TARGET)/src/color.o \
	$(obj).target/$(TARGET)/src/Image.o \
	$(obj).target/$(TARGET)/src/ImageData.o \
	$(obj).target/$(TARGET)/src/init.o \
	$(obj).target/$(TARGET)/src/PixelArray.o \
	$(obj).target/$(TARGET)/src/FontFace.o

# Add to the list of files we specially track dependencies for.
all_deps += $(OBJS)

# CFLAGS et al overrides must be target-local.
# See "Target-specific Variable Values" in the GNU Make manual.
$(OBJS): TOOLSET := $(TOOLSET)
$(OBJS): GYP_CFLAGS := $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))  $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_C_$(BUILDTYPE))
$(OBJS): GYP_CXXFLAGS := $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))  $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_CC_$(BUILDTYPE))

# Suffix rules, putting all outputs into $(obj).

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(srcdir)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

# Try building from generated source, too.

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(obj).$(TOOLSET)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(obj)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

# End of this set of suffix rules
### Rules for final target.
LDFLAGS_Debug := \
	-pthread \
	-rdynamic \
	-m64

LDFLAGS_Release := \
	-pthread \
	-rdynamic \
	-m64

LIBS := \
	-lpixman-1 \
	-lcairo \
	-lpng12 \
	-lpangocairo-1.0 \
	-lpango-1.0 \
	-lgobject-2.0 \
	-lglib-2.0 \
	-ljpeg \
	-lgif

$(obj).target/canvas.node: GYP_LDFLAGS := $(LDFLAGS_$(BUILDTYPE))
$(obj).target/canvas.node: LIBS := $(LIBS)
$(obj).target/canvas.node: TOOLSET := $(TOOLSET)
$(obj).target/canvas.node: $(OBJS) FORCE_DO_CMD
	$(call do_cmd,solink_module)

all_deps += $(obj).target/canvas.node
# Add target alias
.PHONY: canvas
canvas: $(builddir)/canvas.node

# Copy this to the executable output path.
$(builddir)/canvas.node: TOOLSET := $(TOOLSET)
$(builddir)/canvas.node: $(obj).target/canvas.node FORCE_DO_CMD
	$(call do_cmd,copy)

all_deps += $(builddir)/canvas.node
# Short alias for building this executable.
.PHONY: canvas.node
canvas.node: $(obj).target/canvas.node $(builddir)/canvas.node

# Add executable to "all" target.
.PHONY: all
all: $(builddir)/canvas.node

