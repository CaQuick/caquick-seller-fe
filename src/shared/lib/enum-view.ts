/**
 * 생성 enum 값 → 표시값. 앱보다 새 BE가 보낸 모르는 값은 fallback으로 그린다(직접 인덱싱하면 undefined로 죽는다).
 * 표는 이 호출 안에서 `satisfies Record<Enum, V>`로 적어 빠진 값을 컴파일 때 잡는다(enum-view-guard.spec).
 * 프로토타입 키(toString 등)가 표 값으로 새지 않게 자기 속성만 본다.
 */
export function enumView<V>(table: Readonly<Record<string, V>>, fallback: V): (key: string) => V {
  return (key) => (Object.prototype.hasOwnProperty.call(table, key) ? table[key]! : fallback);
}
