// Mock database for compilation
export const db = {
  query: {
    users: {
      findFirst: () => Promise.resolve(null)
    },
    doctors: {
      findFirst: () => Promise.resolve(null)
    },
    patients: {
      findFirst: () => Promise.resolve(null)
    }
  },
  select: () => ({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve([])
      }),
      leftJoin: () => ({
        where: () => Promise.resolve([])
      }),
      orderBy: () => Promise.resolve([])
    })
  }),
  insert: () => ({
    values: () => ({
      returning: () => Promise.resolve([{}])
    })
  }),
  update: () => ({
    set: () => ({
      where: () => Promise.resolve()
    })
  })
};

export const eq = (a: any, b: any) => ({ a, b });
export const sql = (strings: any, ...values: any[]) => ({ strings, values });
export const and = (...args: any[]) => ({ args });
export const desc = (field: any) => ({ field });