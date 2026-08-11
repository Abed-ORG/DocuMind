import {
  useEffect,
  useRef,
  useState,
} from "react";

function useInView(options) {
  const elementRef = useRef(null);
  const [isInView, setIsInView] =
    useState(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        threshold: 0.36,
        ...(options ?? {}),
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [elementRef, isInView];
}

export default useInView;
