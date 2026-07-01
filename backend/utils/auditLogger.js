const prisma = require('../config/prisma');

/**
 * Creates an entry in the audit_logs table.
 * Supports running inside Prisma transaction blocks by accepting a client reference.
 * 
 * @param {object} tx - Prisma transaction context or client instance.
 * @param {object} logData - Audit details.
 * @param {string} logData.tableName - Audited table name.
 * @param {string} logData.recordId - ID of the record.
 * @param {string} logData.action - 'INSERT', 'UPDATE', or 'DELETE'.
 * @param {object} [logData.oldValues] - JSON snapshot before change.
 * @param {object} [logData.newValues] - JSON snapshot after change.
 * @param {string} [logData.userId] - User ID who executed transaction.
 */
const logAudit = async (tx, { tableName, recordId, action, oldValues = null, newValues = null, userId = null }) => {
  const client = tx || prisma;
  try {
    await client.auditLog.create({
      data: {
        tableName,
        recordId: String(recordId),
        action,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
        userId: userId || null
      }
    });
  } catch (error) {
    console.error(`Failed to record audit log for ${tableName}:`, error);
  }
};

module.exports = {
  logAudit
};
