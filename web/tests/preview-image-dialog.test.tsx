import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PreviewImageDialog from "@/components/PreviewImageDialog";

describe("<PreviewImageDialog>", () => {
  it("renders nothing when there are no preview items", () => {
    const { container } = render(<PreviewImageDialog open onOpenChange={vi.fn()} items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens photo slider for image previews", async () => {
    render(
      <PreviewImageDialog
        open
        onOpenChange={vi.fn()}
        items={[{ id: "image-1", kind: "image", sourceUrl: "/image.jpg", posterUrl: "/image.jpg", filename: "image.jpg" }]}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('img[src="/image.jpg"]')).toBeTruthy();
    });
    expect(screen.getByText("image.jpg")).toBeInTheDocument();
    expect(document.querySelector(".PhotoView-Portal")).toBeTruthy();
  });

  it("keeps hook order stable when preview items appear after an empty render", () => {
    const { rerender } = render(<PreviewImageDialog open onOpenChange={vi.fn()} items={[]} />);

    expect(() => {
      rerender(
        <PreviewImageDialog
          open
          onOpenChange={vi.fn()}
          items={[{ id: "image-1", kind: "image", sourceUrl: "/image.jpg", posterUrl: "/image.jpg", filename: "image.jpg" }]}
        />,
      );
    }).not.toThrow();

    expect(document.querySelector('img[src="/image.jpg"]')).toBeTruthy();
  });

  it("renders video previews with controls", async () => {
    render(
      <PreviewImageDialog
        open
        onOpenChange={vi.fn()}
        items={[{ id: "video-1", kind: "video", sourceUrl: "/video.mp4", posterUrl: "/poster.jpg", filename: "video.mp4" }]}
      />,
    );

    await waitFor(() => {
      const video = document.querySelector("video");
      expect(video).toBeTruthy();
      expect(video?.getAttribute("src")).toBe("/video.mp4");
      expect(video?.hasAttribute("controls")).toBe(true);
    });
  });

  it("shows gallery index for multiple images", async () => {
    render(
      <PreviewImageDialog
        open
        onOpenChange={vi.fn()}
        items={[
          { id: "image-1", kind: "image", sourceUrl: "/image-1.jpg", posterUrl: "/image-1.jpg", filename: "image-1.jpg" },
          { id: "image-2", kind: "image", sourceUrl: "/image-2.jpg", posterUrl: "/image-2.jpg", filename: "image-2.jpg" },
        ]}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector(".PhotoView-Slider__Counter")).toHaveTextContent("1 / 2");
    });
  });

  it("notifies parent when closed", async () => {
    const onOpenChange = vi.fn();
    render(
      <PreviewImageDialog
        open
        onOpenChange={onOpenChange}
        items={[{ id: "image-1", kind: "image", sourceUrl: "/image.jpg", posterUrl: "/image.jpg", filename: "image.jpg" }]}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector(".PhotoView-Slider__toolbarIcon")).toBeTruthy();
    });

    fireEvent.click(document.querySelector(".PhotoView-Slider__toolbarIcon")!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
