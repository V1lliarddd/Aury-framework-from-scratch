let activeEffect: (() => void) | null = null;
const targetMap = new WeakMap();

export function effect(fn: () => void) {
  const effectFn = () => {
    activeEffect = effectFn;
    fn();
    activeEffect = null;
  };

  effectFn();
  return effectFn;
}

function reactive(obj: any) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      if (activeEffect) {
        let dependenciesMap = targetMap.get(target);
        if (!dependenciesMap) {
          dependenciesMap = new Map();
          targetMap.set(target, dependenciesMap);
        }

        let dependency = dependenciesMap.get(key);
        if (!dependency) {
          dependency = new Set();
          dependenciesMap.set(key, dependency);
        }

        dependency.add(activeEffect);
      }
      const value = Reflect.get(target, key, receiver);

      if (value && typeof value === "object") {
        return reactive(value);
      }

      return value;
    },

    set(target, key, value, receiver) {
      const oldValue = target[key];

      //Пара дополнительных проверок

      if (Object.is(oldValue, value)) return true;

      if (
        typeof oldValue === "number" &&
        typeof value === "number" &&
        isNaN(oldValue) &&
        isNaN(value)
      )
        return true;

      if (oldValue === value) return true;

      target[key] = value;

      const dependenciesMap = targetMap.get(target);
      if (dependenciesMap) {
        const effects = dependenciesMap.get(key);
        if (effects) effects.forEach((fn: any) => fn());
      }
      return true;
    },

    deleteProperty(target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      const oldVal = target[key];
      const result = Reflect.deleteProperty(target, key);

      if (hadKey && result) {
        const dependenciesMap = targetMap.get(target);
        if (dependenciesMap) {
          const effects = dependenciesMap.get(key);
          if (effects) effects.forEach((fn: any) => fn());
        }
      }
      return result;
    },
  });
}
