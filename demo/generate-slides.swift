import AppKit
import Foundation

struct Slide {
    let slug: String
    let kicker: String
    let title: String
    let body: String
    let screenshot: String?
    let caption: String
}

let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let output = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)

let slides = [
    Slide(
        slug: "01-welcome",
        kicker: "WELCOME TO THE LAB",
        title: "Learn by\nrunning the experiment.",
        body: "A hands-on research simulator for learning how machine-learning systems are built.",
        screenshot: nil,
        caption: "Welcome to Neural Labs: a hands-on research simulator for learning how machine-learning systems are built."
    ),
    Slide(
        slug: "02-overview",
        kicker: "01  /  YOUR WORKSPACE",
        title: "Start with a\nsmall question.",
        body: "Can a model tell cats from dogs? The overview connects data, architecture, training, and evaluation.",
        screenshot: "visualizations-preview.png",
        caption: "Start with a simple question: can a model tell cats from dogs? The overview connects the research steps."
    ),
    Slide(
        slug: "03-model-builder",
        kicker: "02  /  MODEL BUILDER",
        title: "Shape your\nnetwork.",
        body: "Choose a starting architecture, inspect each layer, and tune the design as your experiment takes shape.",
        screenshot: "model-builder-fixed.png",
        caption: "Choose a starting architecture, inspect individual layers, and adjust the network as your experiment takes shape."
    ),
    Slide(
        slug: "04-explanations",
        kicker: "03  /  EXPERIMENT DESIGN",
        title: "See the tradeoffs\nbefore you run.",
        body: "Explanations surface model capacity and tradeoffs beside the controls, making every choice easier to understand.",
        screenshot: "model-preset-click-desktop.jpg",
        caption: "Explanations surface model capacity and tradeoffs beside the controls, making every decision easier to understand."
    ),
    Slide(
        slug: "05-six-contracts",
        kicker: "KEEP FOLLOWING YOUR CURIOSITY",
        title: "From image classifiers\nto language models.",
        body: "Explore six research contracts. Every run is simulated for learning, and progress stays in your browser.",
        screenshot: nil,
        caption: "Explore six contracts, from image classifiers to language models. Results are simulated for learning, and progress stays in your browser."
    )
]

let width = 1440
let height = 900

func topRect(_ rect: NSRect) -> NSRect {
    NSRect(x: rect.minX, y: CGFloat(height) - rect.minY - rect.height, width: rect.width, height: rect.height)
}

func color(_ hex: UInt32, alpha: CGFloat = 1) -> NSColor {
    NSColor(
        calibratedRed: CGFloat((hex >> 16) & 0xff) / 255,
        green: CGFloat((hex >> 8) & 0xff) / 255,
        blue: CGFloat(hex & 0xff) / 255,
        alpha: alpha
    )
}

func drawText(
    _ value: String,
    x: CGFloat,
    y: CGFloat,
    width: CGFloat,
    height: CGFloat,
    size: CGFloat,
    weight: NSFont.Weight = .regular,
    tint: NSColor,
    lineSpacing: CGFloat = 5,
    tracking: CGFloat = 0
) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.lineBreakMode = .byWordWrapping
    paragraph.lineSpacing = lineSpacing
    let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: size, weight: weight),
        .foregroundColor: tint,
        .paragraphStyle: paragraph,
        .kern: tracking
    ]
    NSAttributedString(string: value, attributes: attributes)
        .draw(in: topRect(NSRect(x: x, y: y, width: width, height: height)))
}

func roundedImage(_ image: NSImage, in rect: NSRect, radius: CGFloat) {
    let drawingRect = topRect(rect)
    let path = NSBezierPath(roundedRect: drawingRect, xRadius: radius, yRadius: radius)
    NSGraphicsContext.saveGraphicsState()
    path.addClip()
    image.draw(in: drawingRect, from: .zero, operation: .sourceOver, fraction: 1)
    NSGraphicsContext.restoreGraphicsState()
    color(0xe6e2fa, alpha: 0.6).setStroke()
    path.lineWidth = 1
    path.stroke()
}

func drawImageCard(_ asset: String, in rect: NSRect, radius: CGFloat = 18) throws {
    guard let image = NSImage(contentsOf: root.appendingPathComponent(asset)) else {
        throw NSError(domain: "DemoSlides", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not open \(asset)"])
    }
    let shadow = NSShadow()
    shadow.shadowColor = color(0x080816, alpha: 0.6)
    shadow.shadowBlurRadius = 26
    shadow.shadowOffset = CGSize(width: 0, height: -10)
    NSGraphicsContext.saveGraphicsState()
    shadow.set()
    color(0xffffff).setFill()
    NSBezierPath(roundedRect: topRect(rect), xRadius: radius, yRadius: radius).fill()
    NSGraphicsContext.restoreGraphicsState()
    roundedImage(image, in: rect, radius: radius)
}

func drawPhotoPair() throws {
    let left = NSRect(x: 766, y: 191, width: 250, height: 354)
    let right = NSRect(x: 1036, y: 248, width: 250, height: 354)
    try drawImageCard("public/images/cat.jpg", in: left, radius: 20)
    try drawImageCard("public/images/dog.jpg", in: right, radius: 20)
    drawText("CAT  /  DOG", x: 766, y: 566, width: 520, height: 24, size: 13, weight: .semibold, tint: color(0xc6bafa), tracking: 1.4)
    drawText("Two species.\nOne great model.", x: 766, y: 615, width: 540, height: 116, size: 35, weight: .semibold, tint: color(0xf6f3ff), lineSpacing: 7)
}

for (index, slide) in slides.enumerated() {
    let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!
    let context = NSGraphicsContext(bitmapImageRep: bitmap)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context

    let canvas = NSRect(x: 0, y: 0, width: width, height: height)
    NSGradient(colors: [color(0x151521), color(0x201f38), color(0x211f32)])!
        .draw(in: canvas, angle: 18)

    let glow = NSGradient(colors: [color(0x8b75e5, alpha: 0.16), color(0x8b75e5, alpha: 0)])!
    glow.draw(in: NSBezierPath(ovalIn: topRect(NSRect(x: 925, y: -200, width: 760, height: 520))), relativeCenterPosition: NSPoint(x: 0.25, y: 0.48))

    color(0x9c8bed).setFill()
    NSBezierPath(ovalIn: topRect(NSRect(x: 89, y: 62, width: 10, height: 10))).fill()
    drawText("NEURAL LABS", x: 111, y: 53, width: 230, height: 27, size: 14, weight: .bold, tint: color(0xf4f1ff), tracking: 1.25)
    drawText("PRODUCT WALKTHROUGH", x: 1105, y: 55, width: 245, height: 25, size: 12, weight: .medium, tint: color(0xa9a6be), tracking: 1.15)
    color(0x3b394e).setFill()
    NSBezierPath(rect: topRect(NSRect(x: 88, y: 94, width: 1264, height: 1))).fill()

    drawText(slide.kicker.uppercased(), x: 93, y: 188, width: 550, height: 28, size: 13, weight: .semibold, tint: color(0xc5bafa), tracking: 1.35)
    drawText(slide.title, x: 90, y: 238, width: 570, height: 158, size: 49, weight: .semibold, tint: color(0xf5f2ff), lineSpacing: 8)
    drawText(slide.body, x: 93, y: 422, width: 535, height: 120, size: 22, tint: color(0xc1bfd0), lineSpacing: 8)

    color(0x8f7ce4).setFill()
    NSBezierPath(roundedRect: topRect(NSRect(x: 94, y: 585, width: 52, height: 4)), xRadius: 2, yRadius: 2).fill()
    drawText("BUILD  ·  OBSERVE  ·  LEARN", x: 94, y: 607, width: 420, height: 24, size: 12, weight: .medium, tint: color(0x9f9cb2), tracking: 1.1)

    if let screenshot = slide.screenshot {
        let frame = NSRect(x: 720, y: 123, width: 620, height: 658)
        try drawImageCard(screenshot, in: frame, radius: 16)
        drawText("PROJECT UI  /  \(String(format: "%02d", index))", x: 723, y: 754, width: 350, height: 20, size: 11, weight: .semibold, tint: color(0xaaa6c1), tracking: 1.0)
    } else {
        try drawPhotoPair()
    }

    let captionFrame = NSRect(x: 80, y: 793, width: 1280, height: 78)
    color(0x2d2b42, alpha: 0.97).setFill()
    let actualCaptionPath = NSBezierPath(roundedRect: topRect(captionFrame), xRadius: 15, yRadius: 15)
    actualCaptionPath.fill()
    color(0x5c5774, alpha: 0.65).setStroke()
    actualCaptionPath.lineWidth = 1
    actualCaptionPath.stroke()
    let captionLines: String
    switch index {
    case 0: captionLines = "Welcome to Neural Labs: a hands-on research simulator\nfor learning how machine-learning systems are built."
    case 1: captionLines = "Start with a simple question: can a model tell cats from dogs?\nThe overview connects the research steps."
    case 2: captionLines = "Choose a starting architecture, inspect individual layers,\nand adjust the network as your experiment takes shape."
    case 3: captionLines = "Explanations surface model capacity and tradeoffs beside the controls,\nmaking every decision easier to understand."
    default: captionLines = "Explore six contracts, from image classifiers to language models.\nResults are simulated for learning, and progress stays in your browser."
    }
    drawText(captionLines, x: 108, y: 806, width: 1222, height: 58, size: 19, weight: .medium, tint: color(0xf5f3ff), lineSpacing: 4)

    context.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()
    let png = bitmap.representation(using: .png, properties: [:])!
    try png.write(to: output.appendingPathComponent("\(slide.slug).png"))
}

let narration = slides.map { "\($0.slug)\t\($0.caption)" }.joined(separator: "\n")
try narration.write(to: output.appendingPathComponent("captions.tsv"), atomically: true, encoding: .utf8)
