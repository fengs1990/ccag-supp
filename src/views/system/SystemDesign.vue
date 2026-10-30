<script setup>
import { ref } from 'vue'

const activeSection = ref('user')
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">系统设计问题汇总</div>
        <div class="page-desc">原型阶段需要明确的核心系统设计问题，供技术方案设计和需求评审使用</div>
      </div>
    </div>

    <div style="background:#fff7e6;border-left:4px solid #faad14;padding:16px 20px;margin-bottom:20px;border-radius:4px">
      <div style="font-weight:600;color:#d46b08;margin-bottom:8px;font-size:15px">
        <el-icon style="vertical-align:middle"><Warning /></el-icon>
        重要提示
      </div>
      <div style="font-size:13px;color:#ad6800;line-height:1.6">
        本页面汇总了原型设计过程中发现的所有系统级设计问题。这些问题跨越多个功能模块，需要在详细设计阶段优先明确，否则会影响整体架构设计和开发进度。<br/>
        建议在需求评审会议上逐条讨论，形成《系统设计决策文档》作为后续开发的依据。
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 左侧目录 -->
      <el-col :span="6">
        <el-card shadow="never" style="position:sticky;top:20px">
          <template #header>
            <span style="font-weight:600">问题分类</span>
          </template>
          <el-menu :default-active="activeSection" @select="(key) => activeSection = key">
            <el-menu-item index="user">
              <el-icon><User /></el-icon>
              <span>用户与权限</span>
            </el-menu-item>
            <el-menu-item index="org">
              <el-icon><OfficeBuilding /></el-icon>
              <span>组织与业务域</span>
            </el-menu-item>
            <el-menu-item index="data">
              <el-icon><Upload /></el-icon>
              <span>数据上传与更正</span>
            </el-menu-item>
            <el-menu-item index="approval">
              <el-icon><CircleCheck /></el-icon>
              <span>审批流配置</span>
            </el-menu-item>
            <el-menu-item index="urge">
              <el-icon><Bell /></el-icon>
              <span>督办机制</span>
            </el-menu-item>
            <el-menu-item index="supplement">
              <el-icon><Promotion /></el-icon>
              <span>历史存量批量补录</span>
            </el-menu-item>
          </el-menu>
        </el-card>
      </el-col>

      <!-- 右侧内容 -->
      <el-col :span="18">
        <!-- 用户与权限 -->
        <el-card v-show="activeSection === 'user'" shadow="never" style="margin-bottom:20px">
          <template #header>
            <span style="font-weight:600;font-size:16px;color:#1677ff">用户与权限管理</span>
          </template>

          <div class="question-block">
            <div class="question-title">问题 1：用户数据来源</div>
            <div class="question-desc">
              系统中的用户账号从哪里来？是独立的用户管理模块，还是对接集团统一身份认证平台（如AD域、SSO单点登录）？
            </div>
          </div>

          <el-divider />

          <div class="question-block">
            <div class="question-title">问题 2：用户所属单位、组织、业务域关系</div>
            <div class="question-desc">
              用户与组织、业务域的关系如何维护？一个用户是否可以属于多个单位或多个业务域？
            </div>
            <div class="question-options">
              <div style="font-weight:600;margin-bottom:8px">待确认：</div>
              <ul>
                <li>用户与组织是1:1关系（每人仅属于一个单位），还是1:N关系（兼任多个单位职务）？</li>
                <li>业务域（财务、生产、销售、供应链）是否与用户直接关联，还是通过角色间接关联？</li>
                <li>用户的组织归属是从SSO同步过来，还是在本系统中单独维护？</li>
                <li>组织架构变动（如单位合并、部门调整）时，用户关系如何批量迁移？</li>
              </ul>
            </div>
          </div>

          <el-divider />

          <div class="question-block">
            <div class="question-title">问题 3：角色权限控制方式</div>
            <div class="question-desc">
              角色与权限是读取某个管控系统的，还是补录自行管理？
            </div>
            <div class="question-options">
              <div style="font-weight:600;margin-bottom:8px">待确认：</div>
              <ul>
                <li><strong>使用外部系统角色</strong>需要确定系统，和如何取数</li>
                <li><strong>功能页面</strong>是否需要嵌入某个系统，如果是需要给出嵌入系统的接入方式</li>
              </ul>
            </div>
          </div>
        </el-card>

        <!-- 组织与业务域 -->
        <el-card v-show="activeSection === 'org'" shadow="never" style="margin-bottom:20px">
          <template #header>
            <span style="font-weight:600;font-size:16px;color:#1677ff">组织与业务域管理</span>
          </template>

          <div class="question-block">
            <div class="question-title">问题 4：组织架构数据来源与维护</div>
            <div class="question-desc">
              系统中的组织架构（长安乘用车、长安商用车、长安跨越、阿维塔科技）从哪里来？如何维护？
            </div>
            <div class="question-options">
              <div style="font-weight:600;margin-bottom:8px">待确认：</div>
              <ul>
                <li>组织架构是从集团HR系统同步，还是在本系统中独立维护？</li>
                <li>组织层级有几层（集团→二级单位→三级部门）？本系统需要管理到哪一层？</li>
                <li>组织编码规则（如UNIT_CA、UNIT_CS）是否有统一标准？谁来分配？</li>
                <li>组织合并、拆分、更名时，历史数据如何关联和迁移？</li>
              </ul>
            </div>
          </div>

          <el-divider />

          <div class="question-block">
            <div class="question-title">问题 5：业务域的划分与关联</div>
            <div class="question-desc">
              业务域（财务、生产、销售、供应链）是如何定义的？与组织、模板、用户的关系是什么？
            </div>
            <div class="question-options">
              <div style="font-weight:600;margin-bottom:8px">待确认：</div>
              <ul>
                <li>业务域是固定的4个，还是可以动态扩展（如增加"研发域"、"人力域"）？</li>
                <li>一个模板是否只能属于一个业务域，还是可以跨业务域（如"综合财务报表"同时涉及财务和生产）？</li>
                <li>业务域与数据权限的关系？财务域的管理员能否看到生产域的数据？</li>
                <li>业务域是否影响审批流配置（财务域的单据必须由财务审核员审批）？</li>
              </ul>
            </div>
          </div>
        </el-card>

        <!-- 数据上传与更正 -->
        <el-card v-show="activeSection === 'data'" shadow="never" style="margin-bottom:20px">
          <template #header>
            <span style="font-weight:600;font-size:16px;color:#1677ff">数据上传与更正机制</span>
          </template>

          <div class="question-block">
            <div class="question-title">问题 6：数据录入后上传集团的流程</div>
            <div class="question-desc">
              单据归档后，数据是否需要"上传至集团"？是定期自动上传，还是手动操作？
            </div>
            <div class="question-options">
              <div style="font-weight:600;margin-bottom:8px">待确认：</div>
              <ul>
                <li>上传动作是单据归档后自动触发，还是需要集团管理员手动批量上传？</li>
              </ul>
            </div>
          </div>

          <el-divider />

          <div class="question-block">
            <div class="question-title">问题 7：数据上传后是否允许更正（这里说的不是归档，而是归档后上传到集团）</div>
            <div class="question-desc">
              单据数据已上传至集团后，发现错误需要更正，是否允许？如何处理？
            </div>
            <div class="question-options">
              <div style="font-weight:600;margin-bottom:8px">待确认：</div>
              <ul>
                <li><strong>是否允许更正？</strong>上传后数据是否彻底锁定不可更正，还是允许通过更正单流程修改？</li>
                <li><strong>更正单的效力？</strong>更正单审批通过后，是替换原数据（覆盖），还是作为补充数据（增量），还是标记原数据作废（冲销）？</li>
                <li><strong>集团侧如何处理？</strong>本系统生成更正单后，是否需要通知集团系统同步更新？集团系统是否支持数据覆盖？</li>
                <li><strong>更正次数限制？</strong>是否限制更正次数（如最多更正3次），避免数据频繁变动影响分析？</li>
              </ul>
            </div>
          </div>

          <el-divider />

          <div class="question-block">
            <div class="question-title">问题 8：更正后是否允许再次上传</div>
            <div class="question-desc">
              更正单审批通过后，是自动上传至集团，还是需要手动触发？是否支持多次更正多次上传？
            </div>
            <div class="question-options">
              <div style="font-weight:600;margin-bottom:8px">待确认：</div>
              <ul>
                <li>更正单归档后是否自动进入上传队列，还是需要集团管理员审核后才能上传？</li>
                <li>同一业务编号（biz_no）的多次更正，集团侧如何识别和处理（覆盖、追加、版本管理）？</li>
                <li>如果集团侧拒绝更正数据（如超出数据变更窗口期），本系统如何处理？</li>
                <li>更正数据上传后，是否需要通知下游系统（BI报表、数据应用）刷新缓存？</li>
              </ul>
            </div>
          </div>
        </el-card>

        <!-- 审批流配置 -->
        <el-card v-show="activeSection === 'approval'" shadow="never" style="margin-bottom:20px">
          <template #header>
            <span style="font-weight:600;font-size:16px;color:#1677ff">审批流配置机制</span>
          </template>

          <div class="question-block">
            <div class="question-title">问题 9：审批模式的具体配置逻辑</div>
            <div class="question-desc">
              模板的审批模式包括：单人审批、多级串行审批、按组织自动分派。这些审批模式的具体配置逻辑需要明确。
            </div>
            <div class="question-options">
              <div style="font-weight:600;margin-bottom:8px">待确认：</div>
              <ul>
                <li><strong>多级串行审批：</strong>是否在创建模板时就需要指定"各级或各单位"的"审批角色或审批人"？  和Excel需求文档中说的“跨单位协同补录 - 交叉审核”是否是同一个功能</li>
                <li><strong>按组织自动分派：</strong>是否是自动随机分配一个组织下的某个角色中的人员？分配规则是什么（随机、轮询、负载均衡）？</li>
                <li><strong>审批人分配时机：</strong>是模板配置时固定审批人，还是单据提交时动态分配？</li>
                <li><strong>审批人缺席处理：</strong>如果指定审批人请假、离职，是否支持审批转交、代理审批？</li>
              </ul>
            </div>
          </div>
        </el-card>

        <!-- 督办机制 -->
        <el-card v-show="activeSection === 'urge'" shadow="never" style="margin-bottom:20px">
          <template #header>
            <span style="font-weight:600;font-size:16px;color:#1677ff">督办机制设计</span>
          </template>

          <div class="question-block">
            <div class="question-title">问题 10：督办阈值的配置方式</div>
            <div class="question-desc">
              如何界定驳回次数和逾期天数是否达到阈值？单据表中并没有阈值字段。
            </div>
            <div class="question-options">
              <div style="font-weight:600;margin-bottom:8px">待确认：</div>
              <ul>
                <li>是否所有单据统一使用一个全局阈值（如驳回3次、逾期30天）？</li>
                <li>还是按模板维度配置不同阈值（财务模板更严格，生产模板更宽松）？</li>
                <li>还是按单位维度配置阈值（重点单位更严格）？</li>
                <li>阈值配置是否需要单独的管理界面？由谁来配置和调整？</li>
              </ul>
            </div>
          </div>

          <el-divider />

          <div class="question-block">
            <div class="question-title">问题 11：账期控制与督办单的冲突处理</div>
            <div class="question-desc">
              如果单据逾期时已超过该模板允许的账期范围，此时单据既无法在规定时间内完成，也无法跨账期填报，如何处理？
            </div>
            <div class="question-options">
              <div style="font-weight:600;margin-bottom:8px">待确认：</div>
              <ul>
                <li>是否允许存在督办单的情况下，对应单位在该模板下不受账期控制？</li>
                <li>还是督办单生成后自动延长截止日期和账期限制？</li>
                <li>如何避免督办机制被滥用（故意拖延至账期外，利用督办单绕过账期控制）？</li>
              </ul>
            </div>
          </div>
        </el-card>

        <!-- 历史补录 -->
        <el-card v-show="activeSection === 'supplement'" shadow="never" style="margin-bottom:20px">
          <template #header>
            <span style="font-weight:600;font-size:16px;color:#1677ff">历史数据补录机制</span>
          </template>

          <div class="question-block">
            <div class="question-title">问题 12：数据缺口如何转化为补录单据</div>
            <div class="question-desc">
              缺失指标、断月份、空维度数据，应该只会存在断账期情况，提到的缺指标和空维度应该不会有这种情况，需要讨论！
            </div>
            <div class="question-options">
              <div style="font-weight:600;margin-bottom:8px">待确认：</div>
              <ul>
                <li>是否直接生成“督办单”让对应单位补录对应账期单据即可？</li>
              </ul>
            </div>
          </div>

          <el-divider />

          <div class="question-block">
            <div class="question-title">问题 13：历史补录是否需要生成专门的补录模板</div>
            <div class="question-desc">
              历史数据补录往往涉及跨年度、跨账期的数据缺口，与正常的T-N期内补录场景不同。是否需要单独的补录模板机制？
            </div>
            <div class="question-options">
              <div style="font-weight:600;margin-bottom:8px">待确认：</div>
              <ul>
                <li>是否需要手动选择录入字段生成补录模板（精简字段范围）？</li>
                <li>补录模板是否走标准的模板下发流程？</li>
                <li>补录模板是否不限制账期（允许补录多年前的数据）？</li>
                <li>补录模板与正常模板的关系？补录完成后数据如何与正常模板的数据合并统计？</li>
              </ul>
            </div>
          </div>
        </el-card>

        <!-- 汇总与后续行动 -->
        <el-card shadow="never" style="background:#f0f5ff;border:1px solid #adc6ff">
          <div style="font-weight:600;color:#1677ff;margin-bottom:12px;font-size:16px">
            <el-icon style="vertical-align:middle"><InfoFilled /></el-icon>
            后续行动建议
          </div>
          <div style="font-size:14px;color:#1677ff;line-height:2">
            <strong>1. 需求评审会议</strong><br/>
            　　• 召开系统设计专题评审会，逐条讨论上述13个问题<br/>
            　　• 参会方：业务方（财务、生产、IT）、技术方（架构师、产品经理、开发负责人）、项目管理<br/>
            　　• 输出：《系统设计决策文档》，明确每个问题的方案选择和决策理由<br/><br/>

            <strong>2. 外部系统对接确认</strong><br/>
            　　• 与集团IT部门确认SSO对接方案（接口文档、测试环境）<br/>
            　　• 与集团数据中台确认数据上传接口（ETL规范、CDC事件）<br/>
            　　• 与HR系统确认组织架构同步方案（API接口、同步频率）<br/><br/>

            <strong>3. 详细设计文档</strong><br/>
            　　• 编写《用户与权限设计说明》（角色矩阵、数据权限规则）<br/>
            　　• 编写《审批流引擎设计说明》（流程配置、动态分派、转交代理）<br/>
            　　• 编写《数据上传与更正流程设计》（接口定义、状态机、异常处理）<br/>
            　　• 补充《数据表结构说明文档》（新增表：审批流配置、督办阈值配置、组织历史版本）<br/><br/>

            <strong>4. 原型迭代</strong><br/>
            　　• 根据评审结论，补充"用户管理"、"角色管理"、"组织管理"、"系统配置"等管理页面原型<br/>
            　　• 补充审批流可视化配置界面原型<br/>
            　　• 补充数据上传状态监控页面原型
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.question-block {
  margin-bottom: 24px;
}
.question-title {
  font-weight: 600;
  font-size: 15px;
  color: #1677ff;
  margin-bottom: 10px;
}
.question-desc {
  color: #666;
  margin-bottom: 12px;
  line-height: 1.6;
}
.question-options ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
  line-height: 1.8;
}
.question-options li {
  margin-bottom: 6px;
}
.suggestion-box {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  padding: 12px;
  border-radius: 4px;
  margin-top: 12px;
  color: #389e0d;
  font-size: 13px;
  line-height: 1.8;
}
</style>
