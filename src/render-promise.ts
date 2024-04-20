import { ComponentProps, ComponentType, FC, createElement } from 'react';
import { AsyncComponentProps } from './types';
import { reactive, useReactive } from './reactive';

/**
 * Accepts component `Component` and returns a tuple with async function
 * that on call will render the component with props `resolve` and `reject`
 * as child of wrapped component – second value in the tuple.
 * Returned promise will be resolved/rejected whenever `resolve` or `reject`
 * from props will be called.
 *
 * @example
 * const GetNumberModal = ({ resolve }) => (
 *  <Modal>
 *    <NumberForm onSubmit={resolve} />
 *  </Modal>
 * )
 *
 * const [getNumber, AsyncGetNumberModal] = renderPromise(GetNumberModal);
 *
 * // ...
 * // Render `<AsyncGetNumberModal/>` and later in side effect
 *
 * async function sideEffect() {
 *  // ...
 *
 *  // User will receive modal with number input.
 *  // The promise will be resolved as soon as user submits the form.
 *  // Then the modal will be unmounted.
 *  const number = await getNumber();
 *  // ...
 * }
 */
export function renderPromise<T>(
  Component: ComponentType<AsyncComponentProps<T>>
): [() => Promise<T>, FC];

export function renderPromise<T, Props extends {} | void = void>(
  Component: ComponentType<AsyncComponentProps<T> & Props>
): [(props: Props) => Promise<T>, FC];

export function renderPromise<T, Props extends {} = {}>(
  Component: ComponentType<AsyncComponentProps<T>>
) {
  const $renders = reactive<ComponentProps<typeof Component>[]>([]);

  const call = (props: Props) => {
    const promise = new Promise<T>((resolve, reject) => {
      const componentProps: ComponentProps<typeof Component> = {
        ...props,
        resolve,
        reject,
      };

      $renders(current => [...current, componentProps]);
    });

    promise.finally(() => {
      $renders(([, ...rest]) => rest);
    });

    return promise;
  };

  const Wrapped: FC = () => {
    const [props] = useReactive($renders);
    if (!props) {
      return null;
    }

    return createElement(Component, props);
  };

  Wrapped.displayName = `RenderPromise(${Component.displayName ||
    String(Component)})`;

  return [call, Wrapped] as const;
}
